import React, { useState } from 'react';
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

function InventoryAdd({ history, i18n }) {
  const [error, setError] = useState(null);
  // console.log(history, 'history');
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
              />
            )}
          </Config>
        </CardBody>
      </Card>
    </PageSection>
  );
}

export { InventoryAdd as _InventoryAdd };
export default withI18n()(withRouter(InventoryAdd));
