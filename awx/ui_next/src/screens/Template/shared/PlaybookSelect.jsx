import React, { useCallback, useEffect, useState } from 'react';
import { number, string, oneOfType } from 'prop-types';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import { Select, SelectVariant, SelectOption } from '@patternfly/react-core';
import { ProjectsAPI } from '../../../api';
import useRequest from '../../../util/useRequest';

function PlaybookSelect({
  projectId,
  field,
  helpers,
  onError,
  i18n,
  onChange,
}) {
  const [isDisabled, setIsDisabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    result: options,
    request: fetchOptions,
    isLoading,
    error,
  } = useRequest(
    useCallback(async () => {
      if (!projectId) {
        return [];
      }
      const { data } = await ProjectsAPI.readPlaybooks(projectId);

      const opts = (data || []).map(playbook => ({
        value: playbook,
        key: playbook,
        label: playbook,
        isDisabled: false,
      }));
      return opts;
    }, [projectId]),
    []
  );

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    if (error) {
      if (error.response.status === 403) {
        setIsDisabled(true);
      } else {
        onError(error);
      }
    }
  }, [error, onError]);

  const renderOptions = opts => {
    return opts.map(option => (
      <SelectOption
        key={option.key}
        aria-label={option.label}
        value={option.value}
      >
        {option.label}
      </SelectOption>
    ));
  };

  return (
    <Select
      maxHeight="100vh"
      noResultsFoundText={i18n._(t`No results found`)}
      variant={SelectVariant.typeahead}
      onToggle={() => {
        helpers.setTouched();
        setIsExpanded(!isExpanded);
      }}
      onSelect={(event, selection) => {
        setIsExpanded(false);
        onChange(selection);
      }}
      placeholderText={i18n._(t`Choose a playbook`)}
      onClear={() => {
        helpers.setTouched();
        onChange('');
      }}
      selections={field.value}
      createText={i18n._(t`Create`)}
      id="template-playbook"
      data={options}
      isOpen={isExpanded}
      isDisabled={isLoading || isDisabled}
    >
      {renderOptions(options)}
    </Select>
  );
}
PlaybookSelect.propTypes = {
  projectId: oneOfType([number, string]),
};
PlaybookSelect.defaultProps = {
  projectId: null,
};

export { PlaybookSelect as _PlaybookSelect };
export default withI18n()(PlaybookSelect);
