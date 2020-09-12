import React from 'react';
import { t } from '@lingui/macro';
import { useField } from 'formik';
import InventoryStep from './InventoryStep';
import StepName from './StepName';

const STEP_ID = 'inventory';

export default function useInventoryStep(config, resource, visitedSteps, i18n) {
  const [, meta] = useField('inventory');

  return {
    step: getStep(config, meta, i18n, visitedSteps),
    initialValues: getInitialValues(config, resource),
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
function getStep(config, meta, i18n, visitedSteps) {
  if (!config.ask_inventory_on_launch) {
    return null;
  }
  return {
    id: STEP_ID,
    key: 3,
    name: (
      <StepName
        hasErrors={
          Object.keys(visitedSteps).includes(STEP_ID) &&
          (!meta.value || meta.error)
        }
      >
        {i18n._(t`Inventory`)}
      </StepName>
    ),
    component: <InventoryStep i18n={i18n} />,
    enableNext: true,
  };
}

function getInitialValues(config, resource) {
  if (!config.ask_inventory_on_launch) {
    return {};
  }
  return {
    inventory: resource?.summary_fields?.inventory || null,
  };
}
