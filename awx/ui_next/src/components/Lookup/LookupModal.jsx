import React, { useState, useEffect } from 'react';
import { Button, Modal } from '@patternfly/react-core';
import { t } from '@lingui/macro';
import { withI18n } from '@lingui/react';
import { withRouter } from 'react-router-dom';

import { getQSConfig } from '../../util/qs';
// import AnsibleSelect from '../AnsibleSelect';
// import VerticalSeperator from '../VerticalSeparator';
// import SelectedList from '../SelectedList';

function LookupModal({
  i18n,
  history,
  onChange,
  onToggleItem,
  lookupHeader,
  value,
  multiple,
  qsNamespace,
  sortedColumnKey,
  isOpen,
  toggleModal,
  renderList,
}) {
  const [selectedItems, setSelectedItems] = useState(
    multiple ? [...value] : [value]
  );

  useEffect(() => {
    setSelectedItems(multiple ? [...value] : [value]);
  }, [value, isOpen]);

  const qsConfig = getQSConfig(qsNamespace, {
    page: 1,
    page_size: 5,
    order_by: sortedColumnKey,
  });

  const header = lookupHeader || i18n._(t`Items`);

  const removeItem = row => {
    if (onToggleItem) {
      setSelectedItems(onToggleItem(selectedItems, row));
      return;
    }
    setSelectedItems(selectedItems.filter(item => item.id !== row.id));
  };

  const addItem = row => {
    if (onToggleItem) {
      setSelectedItems(onToggleItem(selectedItems, row));
      return;
    }
    const index = selectedItems.findIndex(item => item.id === row.id);

    if (!multiple) {
      setSelectedItems([row]);
      return;
    }
    if (index > -1) {
      return;
    }
    setSelectedItems([...selectedItems, row]);
  };

  const clearQSParams = () => {
    const parts = history.location.search.replace(/^\?/, '').split('&');
    const ns = qsConfig.namespace;
    const otherParts = parts.filter(param => !param.startsWith(`${ns}.`));
    history.push(`${history.location.pathname}?${otherParts.join('&')}`);
  };

  const cancelModal = () => {
    toggleModal();
  };

  const saveModal = () => {
    if (!isOpen) {
      let newSelectedItems = [];
      if (value) {
        newSelectedItems = multiple ? [...value] : [value];
      }
      setSelectedItems(newSelectedItems);
    } else {
      clearQSParams();
    }
    onChange(multiple ? selectedItems : selectedItems[0] || null);
    toggleModal();
  };

  return (
    <Modal
      className="awx-c-modal"
      title={i18n._(t`Select ${header}`)}
      isOpen={isOpen}
      onClose={cancelModal}
      actions={[
        <Button
          key="select"
          variant="primary"
          onClick={saveModal}
          style={selectedItems.length === 0 ? { display: 'none' } : {}}
        >
          {i18n._(t`Select`)}
        </Button>,
        <Button key="cancel" variant="secondary" onClick={cancelModal}>
          {i18n._(t`Cancel`)}
        </Button>,
      ]}
    >
      {renderList({ selectedItems, addItem, removeItem })}
    </Modal>
  );
}

export default withI18n()(withRouter(LookupModal));
