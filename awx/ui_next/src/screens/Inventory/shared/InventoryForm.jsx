import React, { useState, useEffect } from 'react';
import { Formik, Field } from 'formik';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';

import { VariablesField } from '@components/CodeMirrorInput';
// import ContentError from '@components/ContentError';
// import ContentLoading from '@components/ContentLoading';
import { Form } from '@patternfly/react-core';
import FormField, { FieldTooltip } from '@components/FormField';
import FormActionGroup from '@components/FormActionGroup/FormActionGroup';
import FormRow from '@components/FormRow';
import { required } from '@util/validators';
import InstanceGroupsLookup from '@components/Lookup/InstanceGroupsLookup';
import OrganizationLookup from '@components/Lookup/OrganizationLookup';

function InventoryForm({
  inventory = {},
  i18n,
  handleCancel,
  handleSubmit,
  instanceGroups,
}) {
  const [organization, setOrganization] = useState(
    inventory.organization || null
  );
  // const [instanceGroups, setInstanceGroups] = useState([...instanceGroups] || null);

  const initialValues = !inventory.id
    ? {
        name: inventory.name || '',
        description: inventory.description || '',
        variables: inventory.variables || '---',
        organization,
        instanceGroups: instanceGroups || [],
        credential: inventory.insights_credential,
      }
    : {};
  return (
    <Formik
      initialValues={initialValues}
      onSubmit={values => handleSubmit(values)}
      render={formik => (
        <Form
          autoComplete="off"
          onSubmit={formik.handleSubmit}
          css="padding: 0 24px"
        >
          <FormRow>
            <FormField
              id="inventory-name"
              label={i18n._(t`Name`)}
              name="name"
              type="text"
              validate={required(null, i18n)}
              isRequired
            />
            <FormField
              id="inventory-description"
              label={i18n._(t`Description`)}
              name="description"
              type="text"
            />
            <Field
              id="inventory-organization"
              label={i18n._(t`Organization`)}
              name="organization"
              validate={required(
                i18n._(t`Select a value for this field`),
                i18n
              )}
              render={({ form }) => (
                <OrganizationLookup
                  helperTextInvalid={form.errors.organization}
                  isValid={
                    !form.touched.organization || !form.errors.organization
                  }
                  onBlur={() => form.setFieldTouched('organization')}
                  onChange={value => {
                    form.setFieldValue('organization', value.id);
                    setOrganization(value);
                  }}
                  value={organization}
                  required
                />
              )}
            />
          </FormRow>
          <FormRow>
            <Field
              id="inventory-instanceGroups"
              label={i18n._(t`Instance Groups`)}
              name="instanceGroups"
              render={({ field, form }) => (
                <InstanceGroupsLookup
                  value={field.value}
                  onChange={value => {
                    form.setFieldValue('instanceGroups', value);
                  }}
                />
              )}
            />
          </FormRow>
          <FormRow>
            <VariablesField
              tooltip={i18n._(
                t`Enter inventory variables using either JSON or YAML syntax. Use the radio button to toggle between the two. Refer to the Ansible Tower documentation for example syntax`
              )}
              id="inventory-variables"
              name="variables"
              label={i18n._(t`Variables`)}
            />
          </FormRow>
          <FormRow>
            <FormActionGroup
              onCancel={handleCancel}
              onSubmit={formik.handleSubmit}
              // submitDisabled={!formIsValid}
            />
          </FormRow>
        </Form>
      )}
    />
  );
}

export default withI18n()(InventoryForm);
