import React, { useState, useEffect } from 'react';
import { withI18n } from '@lingui/react';
import { withRouter } from 'react-router-dom';
import { t } from '@lingui/macro';
import {
  PageSection,
  Card,
  CardHeader,
  CardBody,
  Tooltip,
} from '@patternfly/react-core';

import { Config } from '@contexts/Config';
import CardCloseButton from '@components/CardCloseButton';
import { InventoriesAPI } from '@api';
import InventoryForm from '../shared/InventoryForm';

function InventoryEdit({ history, i18n, inventory }) {
  const [error, setError] = useState(null);
  const [instanceGroups, setInstanceGroups] = useState(null);
  useEffect(() => {
    const loadInstanceGroup = async () => {
      try {
        const { data } = await InventoriesAPI.readInstanceGroups(inventory.id);
        setInstanceGroups(data.results);
      } catch (err) {
        setError(err);
      }
    };
    loadInstanceGroup();
  }, []);
  const handleCancel = () => {
    history.push('/inventories');
  };
  const handleSubmit = async values => {
    try {
      const { data: response } = await InventoriesAPI.create(values);
      const url = history.location.pathname.search('smart')
        ? `/inventories/smart_inventory/${response.id}/details`
        : `/inventories/inventory/${response.id}/details`;
      history.push(`${url}`);
    } catch (err) {
      setError(err);
    }
  };
  return (
    <PageSection>
      <Card>
        <CardHeader className="at-u-textRight">
          <Tooltip content={i18n._(t`Close`)} position="top">
            <CardCloseButton onClick={handleCancel} />
          </Tooltip>
        </CardHeader>
        <CardBody>
          <Config>
            {({ me }) => (
              <InventoryForm
                handleCancel={handleCancel}
                handleSubmit={handleSubmit}
                error={error}
                me={me}
                inventory={inventory}
                instanceGroups={instanceGroups}
              />
            )}
          </Config>
        </CardBody>
      </Card>
    </PageSection>
  );
}

export { InventoryEdit as _InventoryEdit };
export default withI18n()(withRouter(InventoryEdit));
