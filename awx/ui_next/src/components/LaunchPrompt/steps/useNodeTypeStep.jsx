import React from 'react';
import { t } from '@lingui/macro';
import { useField } from 'formik';
import { NodeTypeStep } from './NodeTypeStep';

const STEP_ID = 'nodeType';

export default function useNodeTypeStep(isWorkflowNode, i18n) {
  const [, meta] = useField('nodeType');
  const [approvalNameField] = useField('approvalName');
  const [nodeTypeField, ,] = useField('nodeType');
  const [nodeResouceField] = useField('nodeResource');

  return {
    step: getStep(
      isWorkflowNode,
      meta,
      i18n,
      nodeTypeField,
      approvalNameField,
      nodeResouceField
    ),
    initialValues: getInitialValues(isWorkflowNode),
    isReady: true,
    contentError: null,
    formError: meta.error,
    setTouched: setFieldsTouched => {
      setFieldsTouched({
        inventory: true,
      });
    },
  };
}
function getStep(
  isWorkflowNode,
  meta,
  i18n,
  nodeTypeField,
  approvalNameField,
  nodeResouceField
) {
  if (!isWorkflowNode) {
    return null;
  }
  const isEnabled = () => {
    if (
      (nodeTypeField.value !== 'approval' && nodeResouceField.value !== null) ||
      (nodeTypeField.value === 'approval' && approvalNameField.value !== '')
    ) {
      return false;
    }
    return true;
  };
  return {
    id: STEP_ID,
    key: 3,
    name: i18n._(t`Node Type`),
    component: <NodeTypeStep i18n={i18n} />,
    enableNext: !isEnabled(),
  };
}

function getInitialValues(isWorkflowNode) {
  if (!isWorkflowNode) {
    return {};
  }
  return {
    nodeType: 'job_template',
  };
}
