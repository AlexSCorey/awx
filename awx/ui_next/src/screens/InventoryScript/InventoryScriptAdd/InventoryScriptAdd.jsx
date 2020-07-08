import React from 'react';
import { withI18n } from '@lingui/react';
import { Card, PageSection } from '@patternfly/react-core';

function InventoryScriptAdd() {
  return (
    <PageSection>
      <Card>Inventory script Add</Card>
    </PageSection>
  );
}

export default withI18n()(InventoryScriptAdd);
