import 'styled-components/macro';
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Formik, useFormikContext } from 'formik';

import { bool, node, func } from 'prop-types';
import {
  Button,
  WizardContextConsumer,
  WizardFooter,
  Form,
} from '@patternfly/react-core';
import ContentError from '../../../../../components/ContentError';

import useRequest, {
  useDismissableError,
} from '../../../../../util/useRequest';
import {
  WorkflowDispatchContext,
  WorkflowStateContext,
} from '../../../../../contexts/Workflow';
import { JobTemplatesAPI, WorkflowJobTemplatesAPI } from '../../../../../api';
import Wizard from '../../../../../components/Wizard';
import { NodeTypeStep } from './NodeTypeStep';
import useSteps from '../../../../../components/LaunchPrompt/useSteps';
import AlertModal from '../../../../../components/AlertModal';

import RunStep from './RunStep';
import NodeNextButton from './NodeNextButton';

function canLaunchWithoutPrompt(launchData) {
  return (
    launchData.can_start_without_user_input &&
    !launchData.ask_inventory_on_launch &&
    !launchData.ask_variables_on_launch &&
    !launchData.ask_limit_on_launch &&
    !launchData.ask_scm_branch_on_launch &&
    !launchData.survey_enabled &&
    (!launchData.variables_needed_to_start ||
      launchData.variables_needed_to_start.length === 0)
  );
}

function NodeModal({ askLinkType, i18n, onSave, title }) {
  const history = useHistory();
  const dispatch = useContext(WorkflowDispatchContext);
  const { nodeToEdit } = useContext(WorkflowStateContext);
  const { values, resetForm, setTouched, validateForm } = useFormikContext();
  let defaultApprovalDescription = '';
  let defaultApprovalName = '';
  let defaultApprovalTimeout = 0;
  let defaultNodeResource = null;
  let defaultNodeType = 'job_template';
  if (nodeToEdit && nodeToEdit.unifiedJobTemplate) {
    if (
      nodeToEdit &&
      nodeToEdit.unifiedJobTemplate &&
      (nodeToEdit.unifiedJobTemplate.type ||
        nodeToEdit.unifiedJobTemplate.unified_job_type)
    ) {
      const ujtType =
        nodeToEdit.unifiedJobTemplate.type ||
        nodeToEdit.unifiedJobTemplate.unified_job_type;
      switch (ujtType) {
        case 'job_template':
        case 'job':
          defaultNodeType = 'job_template';
          defaultNodeResource = nodeToEdit.unifiedJobTemplate;
          break;
        case 'project':
        case 'project_update':
          defaultNodeType = 'project_sync';
          defaultNodeResource = nodeToEdit.unifiedJobTemplate;
          break;
        case 'inventory_source':
        case 'inventory_update':
          defaultNodeType = 'inventory_source_sync';
          defaultNodeResource = nodeToEdit.unifiedJobTemplate;
          break;
        case 'workflow_job_template':
        case 'workflow_job':
          defaultNodeType = 'workflow_job_template';
          defaultNodeResource = nodeToEdit.unifiedJobTemplate;
          break;
        case 'workflow_approval_template':
        case 'workflow_approval':
          defaultNodeType = 'approval';
          defaultApprovalName = nodeToEdit.unifiedJobTemplate.name;
          defaultApprovalDescription =
            nodeToEdit.unifiedJobTemplate.description;
          defaultApprovalTimeout = nodeToEdit.unifiedJobTemplate.timeout;
          break;
        default:
      }
    }
  }
  const [approvalDescription, setApprovalDescription] = useState(
    defaultApprovalDescription
  );
  const [approvalName, setApprovalName] = useState(defaultApprovalName);
  const [approvalTimeout, setApprovalTimeout] = useState(
    defaultApprovalTimeout
  );
  const [linkType, setLinkType] = useState('success');
  const [nodeResource, setNodeResource] = useState(defaultNodeResource);
  const [nodeType, setNodeType] = useState(defaultNodeType);
  const [triggerNext, setTriggerNext] = useState(0);
  const [showPromptSteps, setShowPromptSteps] = useState(false);

  const {
    request: readLaunchConfig,
    error: launchConfigError,
    // isLoading,
    result: launchConfig,
  } = useRequest(
    useCallback(async () => {
      const readLaunch =
        nodeResource.type === 'workflow_job_template'
          ? WorkflowJobTemplatesAPI.readLaunch(nodeResource.id)
          : JobTemplatesAPI.readLaunch(nodeResource.id);

      const { data } = await readLaunch;
      if (!canLaunchWithoutPrompt(data)) {
        setShowPromptSteps(true);
      }
      return data;
    }, [nodeResource]),
    { launchConfig: {} }
  );

  useEffect(() => {
    if (
      nodeResource?.type === 'workflow_job_template' ||
      nodeResource?.type === 'job_template'
    ) {
      readLaunchConfig();
    }
  }, [readLaunchConfig, nodeResource]);

  const clearQueryParams = () => {
    const parts = history.location.search.replace(/^\?/, '').split('&');
    const otherParts = parts.filter(param =>
      /^!(job_templates\.|projects\.|inventory_sources\.|workflow_job_templates\.)/.test(
        param
      )
    );
    history.replace(`${history.location.pathname}?${otherParts.join('&')}`);
  };
  const handleSaveNode = () => {
    clearQueryParams();

    const resource =
      nodeType === 'approval'
        ? {
            description: approvalDescription,
            name: approvalName,
            timeout: approvalTimeout,
            type: 'workflow_approval_template',
          }
        : nodeResource;
    onSave(resource, askLinkType ? linkType : null, values);
  };

  const handleCancel = () => {
    clearQueryParams();
    dispatch({ type: 'CANCEL_NODE_MODAL' });
  };

  const handleNodeTypeChange = newNodeType => {
    setNodeType(newNodeType);
    setNodeResource(null);
    setApprovalName('');
    setApprovalDescription('');
    setApprovalTimeout(0);
  };
  const {
    steps: promptSteps,
    initialValues: promptStepsInitialValues,
    isReady,
    validate,
    visitStep,
    visitAllSteps,
    contentError,
  } = useSteps(launchConfig, nodeResource, i18n);

  useEffect(() => {
    if (Object.values(promptStepsInitialValues).length > 0) {
      resetForm({
        values: {
          ...promptStepsInitialValues,
          verbosity: promptStepsInitialValues.verbosity.toString(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchConfig]);

  const { error, dismissError } = useDismissableError(
    launchConfigError || contentError
  );

  const steps = [
    ...(askLinkType
      ? [
          {
            name: i18n._(t`Run Type`),
            key: 'run_type',
            component: (
              <RunStep linkType={linkType} onUpdateLinkType={setLinkType} />
            ),
            enableNext: linkType !== null,
          },
        ]
      : []),
    {
      name: i18n._(t`Node Type`),
      key: 'node_resource',
      enableNext:
        (nodeType !== 'approval' && nodeResource !== null) ||
        (nodeType === 'approval' && approvalName !== ''),
      component: (
        <NodeTypeStep
          description={approvalDescription}
          name={approvalName}
          nodeResource={nodeResource}
          nodeType={nodeType}
          onUpdateDescription={setApprovalDescription}
          onUpdateName={setApprovalName}
          onUpdateNodeResource={setNodeResource}
          onUpdateNodeType={handleNodeTypeChange}
          onUpdateTimeout={setApprovalTimeout}
          timeout={approvalTimeout}
        />
      ),
    },
    ...(showPromptSteps && promptSteps.length > 1 && isReady
      ? [...promptSteps]
      : []),
  ];

  steps.forEach((step, n) => {
    step.id = n + 1;
  });
  const CustomFooter = (
    <WizardFooter>
      <WizardContextConsumer>
        {({ activeStep, onNext, onBack }) => (
          <>
            <NodeNextButton
              triggerNext={triggerNext}
              activeStep={activeStep}
              onNext={onNext}
              onClick={() => setTriggerNext(triggerNext + 1)}
              buttonText={
                (activeStep.key === 'node_resource' && steps.length <= 1) ||
                activeStep.name === 'Preview'
                  ? i18n._(t`Save`)
                  : i18n._(t`Next`)
              }
            />
            {activeStep && activeStep.id !== 1 && (
              <Button id="back-node-modal" variant="secondary" onClick={onBack}>
                {i18n._(t`Back`)}
              </Button>
            )}
            <Button
              id="cancel-node-modal"
              variant="link"
              onClick={handleCancel}
            >
              {i18n._(t`Cancel`)}
            </Button>
          </>
        )}
      </WizardContextConsumer>
    </WizardFooter>
  );

  const wizardTitle = nodeResource ? `${title} | ${nodeResource.name}` : title;

  if (launchConfigError || contentError) {
    return (
      <AlertModal
        isOpen={error}
        variant="error"
        title={i18n._(t`Error!`)}
        onClose={() => {
          dismissError();
        }}
      >
        <ContentError error={error} />
      </AlertModal>
    );
  }
  return (
    <Wizard
      footer={CustomFooter}
      isOpen={!error || !contentError}
      onClose={handleCancel}
      onSave={() => {
        handleSaveNode();
        validate(values);
      }}
      steps={steps}
      css="overflow: scroll"
      title={wizardTitle}
      onNext={async (nextStep, prevStep) => {
        if (nextStep.id === 'preview') {
          visitAllSteps(setTouched);
        } else {
          visitStep(prevStep.prevId);
        }
        await validateForm();
      }}
    />
  );
}

const NodeModalForm = ({ onSave, i18n, askLinkType, title }) => {
  const onSaveForm = (resource, linkType, values) => {
    onSave(resource, linkType, values);
  };

  return (
    <Formik initialValues={{}} onSave={() => onSaveForm}>
      {formik => (
        <Form autoComplete="off" onSubmit={formik.handleSubmit}>
          <NodeModal
            onSave={onSaveForm}
            i18n={i18n}
            title={title}
            askLinkType={askLinkType}
          />
        </Form>
      )}
    </Formik>
  );
};

NodeModal.propTypes = {
  askLinkType: bool.isRequired,
  onSave: func.isRequired,
  title: node.isRequired,
};

export default withI18n()(NodeModalForm);
