import React, { useCallback, useState } from 'react';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Route, Switch } from 'react-router-dom';
// import { Config } from '../../contexts/Config';

import Breadcrumbs from '../../components/Breadcrumbs';
import InventoryScriptAdd from './InventoryScriptAdd';
import InventoryScriptList from './InventoryScriptList';

function InventoryScripts({ i18n }) {
  const [breadcrumbConfig, setBreadcrumbConfig] = useState({
    '/inventory_scripts': i18n._(t`Inventory Scripts`),
    '/inventory_scripts/add': i18n._(t`Create new inventory script`),
  });
  const buildBreadcrumbConfig = useCallback(
    inventoryScript => {
      if (!inventoryScript) {
        return;
      }

      setBreadcrumbConfig({
        '/inventory_scripts': i18n._(t`Inventory Scripts`),
        '/inventory_scripts/add': i18n._(t`Create new inventory script`),
      });
    },
    [i18n]
  );
  return (
    <>
      <Breadcrumbs breadcrumbConfig={breadcrumbConfig} />
      <Switch>
        <Route path="/inventory_scripts/add">
          <InventoryScriptAdd />
        </Route>
        <Route path="/inventory_scripts">
          <InventoryScriptList buildBreadcrumbConfig={buildBreadcrumbConfig} />
        </Route>
      </Switch>
    </>
  );
}

export default withI18n()(InventoryScripts);
