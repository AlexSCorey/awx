import React, { useState, useCallback } from 'react';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Button,
  DataListAction as _DataListAction,
  DataListCheck,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Tooltip,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import DataListCell from '../../../components/DataListCell';
import { InventoryScriptsAPI } from '../../../api';
import { timeOfDay } from '../../../util/dates';
import CopyButton from '../../../components/CopyButton';

const DataListAction = styled(_DataListAction)`
  align-items: center;
  display: grid;
  grid-gap: 16px;
  grid-template-columns: repeat(2, 40px);
`;

function InventoryScriptListItem({
  inventoryScript,
  i18n,
  isSelected,
  onSelect,
  detailUrl,
  fetchInventoryScripts,
}) {
  const [isDisabled, setIsDisabled] = useState(false);

  const copyInventoryScript = useCallback(async () => {
    await InventoryScriptsAPI.copy(inventoryScript.id, {
      name: `${inventoryScript.name} @ ${timeOfDay()}`,
    });
    await fetchInventoryScripts();
  }, [inventoryScript.id, inventoryScript.name, fetchInventoryScripts]);

  const labelId = `check-action-${inventoryScript.id}`;
  return (
    <DataListItem
      key={inventoryScript.id}
      aria-labelledby={labelId}
      id={`${inventoryScript.id}`}
    >
      <DataListItemRow>
        <DataListCheck
          id={`select-inventoryScript-${inventoryScript.id}`}
          checked={isSelected}
          onChange={onSelect}
          aria-labelledby={labelId}
        />
        <DataListItemCells
          dataListCells={[
            <DataListCell
              key="divider"
              aria-label={i18n._(t`inventory script name`)}
            >
              <Link to={`${detailUrl}`}>
                <b>{inventoryScript.name}</b>
              </Link>
            </DataListCell>,
            <DataListCell
              key="organization name"
              aria-label={i18n._(t`organization name`)}
            >
              {inventoryScript.summary_fields.organization.name}
            </DataListCell>,
          ]}
        />
        <DataListAction
          aria-label="actions"
          aria-labelledby={labelId}
          id={labelId}
        >
          {inventoryScript.summary_fields.user_capabilities.edit ? (
            <Tooltip content={i18n._(t`Edit inventory script`)} position="top">
              <Button
                isDisabled={isDisabled}
                aria-label={i18n._(t`Edit inventory script`)}
                variant="plain"
                component={Link}
                to={`/inventory_scripts/${inventoryScript.id}/edit`}
              >
                <PencilAltIcon />
              </Button>
            </Tooltip>
          ) : (
            ''
          )}
          {inventoryScript.summary_fields.user_capabilities.copy && (
            <CopyButton
              aria-label={i18n._(t`copy inventory script`)}
              copyItem={copyInventoryScript}
              isDisabled={isDisabled}
              onLoading={() => setIsDisabled(true)}
              onDoneLoading={() => setIsDisabled(false)}
              helperText={{
                tooltip: i18n._(t`Copy inventory script`),
                errorMessage: i18n._(t`Failed to copy inventory script.`),
              }}
            />
          )}
        </DataListAction>
      </DataListItemRow>
    </DataListItem>
  );
}

export default withI18n()(InventoryScriptListItem);
