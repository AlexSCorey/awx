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
import NodeBackButton from './NodeBackButton';

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

function NodeModalForm({
  askLinkType,
  i18n,
  onSave,
  title,
  getNodeResource,
  showPromptSteps,
  promptSteps,
  promptStepsInitialValues,
  isReady,
  visitStep,
  visitAllSteps,
  contentError,
  error,
  dismissError,
}) {
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

  useEffect(() => getNodeResource(nodeResource), [
    nodeResource,
    getNodeResource,
  ]);

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

  useEffect(() => {
    if (Object.values(promptStepsInitialValues).length > 0) {
      resetForm({
        values: {
          ...promptStepsInitialValues,
          verbosity: promptStepsInitialValues?.verbosity?.toString(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptSteps.length]);

  const steps = [
    ...(askLinkType
      ? [
          {
            name: i18n._(t`Run Type`),
            key: 1,
            component: (
              <RunStep linkType={linkType} onUpdateLinkType={setLinkType} />
            ),
            enableNext: linkType !== null,
            id: 'runType',
          },
        ]
      : []),
    {
      name: i18n._(t`Node Type`),
      key: 2,
      enableNext:
        isReady &&
        ((nodeType !== 'approval' && nodeResource !== null) ||
          (nodeType === 'approval' && approvalName !== '')),
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
      id: 'nodeType',
    },
    ...(showPromptSteps && promptSteps.length > 1 && isReady
      ? [...promptSteps]
      : []),
  ];

  const CustomFooter = (
    <WizardFooter>
      <WizardContextConsumer>
        {({ activeStep, onNext, onBack }) => (
          <>
            {console.log(activeStep.key, triggerNext, 'trigger')}
            <NodeNextButton
              triggerNext={triggerNext}
              activeStep={activeStep}
              onNext={onNext}
              onClick={() => {
                // console.log(activeStep.key, 'here');
                setTriggerNext(activeStep.key);
              }}
              buttonText={
                (activeStep.key === 'node_resource' && steps.length <= 2) ||
                activeStep.name === 'Preview'
                  ? i18n._(t`Save`)
                  : i18n._(t`Next`)
              }
            />
            {activeStep && activeStep.id !== 'runType' && (
              <Button
                id="back-node-modal"
                variant="secondary"
                onClick={() => {
                  setTriggerNext(activeStep.key - 1);
                  onBack({ id: activeStep.key }, { id: triggerNext });
                }}
              >
                {i18n._(t`Back`)}
              </Button>
              // <NodeBackButton
              //   id="back-node-modal"
              //   variant="secondary"
              //   activeStep={activeStep}
              //   triggerNext={triggerNext}
              //   onBack={onBack}
              //   buttonText={i18n._(t`Back`)}
              //   onClick={() => {
              //     const index = steps.findIndex(
              //       step => step.id === activeStep.id
              //     );
              //     setTriggerNext(activeStep.key - 1);
              //   }}
              // />
              //   {i18n._(t`Back`)}
              // </Button>
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

  if (error) {
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

const NodeModal = ({ onSave, i18n, askLinkType, title }) => {
  const onSaveForm = (resource, linkType, values) => {
    onSave(resource, linkType, values);
  };
  const [resource, setResource] = useState(null);
  const [showPromptSteps, setShowPromptSteps] = useState(false);

  const {
    request: readLaunchConfig,
    error: launchConfigError,
    result: launchConfig,
    isLoading,
  } = useRequest(
    useCallback(async () => {
      const readLaunch =
        resource.type === 'workflow_job_template'
          ? WorkflowJobTemplatesAPI.readLaunch(resource.id)
          : JobTemplatesAPI.readLaunch(resource.id);

      const { data } = await readLaunch;
      if (!canLaunchWithoutPrompt(data)) {
        setShowPromptSteps(true);
      }
      return data;
    }, [resource]),
    {}
  );

  useEffect(() => {
    if (
      resource?.type === 'workflow_job_template' ||
      resource?.type === 'job_template'
    ) {
      readLaunchConfig();
    }
  }, [readLaunchConfig, resource]);

  const {
    steps: promptSteps,
    initialValues: promptStepsInitialValues,
    isReady,
    validate,
    visitStep,
    visitAllSteps,
    contentError,
  } = useSteps(launchConfig, resource, i18n);
  const { error, dismissError } = useDismissableError(
    launchConfigError || contentError
  );

  let ready =
    Object.values(launchConfig).length > 0 && resource && isReady && !isLoading;
  if (
    resource?.type !== 'workflow_job_template' &&
    resource?.type !== 'job_template'
  ) {
    ready = true;
  }
  return (
    <Formik
      initialValues={promptStepsInitialValues}
      onSave={() => onSaveForm}
      validate={validate}
    >
      {formik => (
        <Form autoComplete="off" onSubmit={formik.handleSubmit}>
          <NodeModalForm
            onSave={onSaveForm}
            i18n={i18n}
            title={title}
            askLinkType={askLinkType}
            promptSteps={promptSteps}
            promptStepsInitialValues={promptStepsInitialValues}
            isReady={ready}
            visitStep={visitStep}
            visitAllSteps={visitAllSteps}
            contentError={contentError}
            getNodeResource={res => setResource(res)}
            showPromptSteps={showPromptSteps}
            error={error}
            dismissError={dismissError}
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

export default withI18n()(NodeModal);
