import React, { useCallback, useEffect } from 'react';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Card, PageSection } from '@patternfly/react-core';
import useRequest, { useDeleteItems } from '../../../util/useRequest'; // { useDeleteItems }

import { getQSConfig, parseQueryString } from '../../../util/qs';
import PaginatedDataList, {
  ToolbarDeleteButton,
  ToolbarAddButton,
} from '../../../components/PaginatedDataList';
import { InventoryScriptsAPI } from '../../../api';
import AlertModal from '../../../components/AlertModal';
import DatalistToolbar from '../../../components/DataListToolbar';
import ErrorDetail from '../../../components/ErrorDetail';
import useSelected from '../../../util/useSelected';
import InventoryScriptListItem from './InventoryScriptListItem';

const QS_CONFIG = getQSConfig('inventory_script', {
  page: 1,
  page_size: 20,
  order_by: 'name',
});

function InventoryScriptList({ i18n }) {
  const match = useRouteMatch();
  const location = useLocation();
  const {
    isLoading,
    error,
    request: fetchInventoryScripts,
    result: { itemCount, actions, inventoryScripts },
  } = useRequest(
    useCallback(async () => {
      const params = parseQueryString(QS_CONFIG, location.search);

      const [response, responseActions] = await Promise.all([
        InventoryScriptsAPI.read(params),
        InventoryScriptsAPI.readOptions(),
      ]);

      return {
        inventoryScripts: response.data.results,
        itemCount: response.data.count,
        actions: responseActions.data.actions,
      };
    }, [location.search]),
    { itemCount: 0, inventoryScripts: [] }
  );

  useEffect(() => {
    fetchInventoryScripts();
  }, [fetchInventoryScripts]);

  const { selected, isAllSelected, handleSelect, setSelected } = useSelected(
    inventoryScripts
  );

  const {
    isLoading: isDeleteLoading,
    deletionError,
    deleteItems: handleDeleteInventoryScripts,
    clearDeletionError,
  } = useDeleteItems(
    useCallback(async () => {
      setSelected([]);
    }, [selected, setSelected]),
    {
      qsConfig: QS_CONFIG,
      allItemsSelected: isAllSelected,
      fetchItems: fetchInventoryScripts,
    }
  );

  const canAdd = actions && actions.POST;

  return (
    <PageSection>
      <Card>
        <PaginatedDataList
          contentError={error}
          hasContentLoading={isLoading || isDeleteLoading}
          items={inventoryScripts}
          itemCount={itemCount}
          pluralizedItemName={i18n._(t`Inventory Scripts`)}
          qsConfig={QS_CONFIG}
          onRowClick={handleSelect}
          toolbarSearchColumns={[
            {
              name: i18n._(t`Name`),
              key: 'name',
              isDefault: true,
            },
            {
              name: i18n._(t`Created By (Username)`),
              key: 'created_by__username',
            },
            {
              name: i18n._(t`Modified By (Username)`),
              key: 'modified_by__username',
            },
          ]}
          toolbarSortColumns={[
            {
              name: i18n._(t`Name`),
              key: 'name',
            },
          ]}
          renderToolbar={props => (
            <DatalistToolbar
              {...props}
              showSelectAll
              showExpandCollapse
              isAllSelected={isAllSelected}
              onSelectAll={isSelected =>
                setSelected(isSelected ? [...inventoryScripts] : [])
              }
              qsConfig={QS_CONFIG}
              additionalControls={[
                ...(canAdd
                  ? [<ToolbarAddButton linkTo="/inventory_scripts/add" />]
                  : []),
                <ToolbarDeleteButton
                  key="delete"
                  onDelete={handleDeleteInventoryScripts}
                  itemsToDelete={selected}
                  pluralizedItemName={i18n._(t`Inventory Scripts`)}
                />,
              ]}
            />
          )}
          renderItem={inventoryScript => (
            <InventoryScriptListItem
              key={inventoryScript.id}
              value={inventoryScript.name}
              inventoryScript={inventoryScript}
              detailUrl={`${match.url}/${inventoryScript.id}/details`}
              onSelect={() => handleSelect(inventoryScript)}
              isSelected={selected.some(row => row.id === inventoryScript.id)}
              fetchInventoryScripts={fetchInventoryScripts}
            />
          )}
          emptyStateControls={canAdd && <ToolbarAddButton />}
        />
      </Card>
      <AlertModal
        isOpen={deletionError}
        variant="error"
        aria-label={i18n._(t`Deletion Error`)}
        title={i18n._(t`Error!`)}
        onClose={clearDeletionError}
      >
        {i18n._(t`Failed to delete one or more inventory scripts.`)}
        <ErrorDetail error={deletionError} />
      </AlertModal>
    </PageSection>
  );
}

export default withI18n()(InventoryScriptList);
