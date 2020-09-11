import React, { useContext } from 'react';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import {
  WorkflowDispatchContext,
  WorkflowStateContext,
} from '../../../../../contexts/Workflow';
import NodeModal from './NodeModal';
import { getAddedAndRemoved } from '../../../../../util/lists';

function NodeAddModal({ i18n }) {
  const dispatch = useContext(WorkflowDispatchContext);
  const { addNodeSource } = useContext(WorkflowStateContext);

  const addNode = (resource, linkType, values) => {
    if (values) {
      const { added, removed } = getAddedAndRemoved(
        resource?.summary_fields?.credentials,
        values?.credentials
      );

      values.inventory = values?.inventory?.id;
      values.addedCredentials = added?.map(cred => cred.id);
      values.removedCredentials = removed?.map(cred => cred.id);
    }
    const node = {
      linkType,
      nodeResource: resource,
    };
    if (
      values &&
      (resource.type === 'job_template' ||
        resource.type === 'workflow_job_template')
    ) {
      node.promptValues = values;
    }
    dispatch({
      type: 'CREATE_NODE',
      node,
    });
  };

  return (
    <NodeModal
      askLinkType={addNodeSource !== 1}
      onSave={addNode}
      title={i18n._(t`Add Node`)}
    />
  );
}

export default withI18n()(NodeAddModal);
