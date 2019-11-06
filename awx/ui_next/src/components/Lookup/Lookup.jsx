import React, { Fragment } from 'react';
import {
  string,
  bool,
  arrayOf,
  func,
  number,
  oneOfType,
  shape,
} from 'prop-types';
import { t } from '@lingui/macro';

import { withRouter } from 'react-router-dom';
import { SearchIcon } from '@patternfly/react-icons';
import {
  Button,
  ButtonVariant,
  InputGroup as PFInputGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { withI18n } from '@lingui/react';
import styled from 'styled-components';

import AnsibleSelect from '../AnsibleSelect';
import VerticalSeperator from '../VerticalSeparator';
import SelectedList from '../SelectedList';
import LookupModal from './LookupModal';
import PaginatedDataList from '../PaginatedDataList';
import DataListToolbar from '../DataListToolbar';
import CheckboxListItem from '../CheckboxListItem';
import { ChipGroup, Chip, CredentialChip } from '../Chip';
import { getQSConfig, parseQueryString } from '../../util/qs';

const SearchButton = styled(Button)`
  ::after {
    border: var(--pf-c-button--BorderWidth) solid
      var(--pf-global--BorderColor--200);
  }
`;

const InputGroup = styled(PFInputGroup)`
  ${props =>
    props.multiple &&
    `
    --pf-c-form-control--Height: 90px;
    overflow-y: auto;
  `}
`;

const ChipHolder = styled.div`
  --pf-c-form-control--BorderTopColor: var(--pf-global--BorderColor--200);
  --pf-c-form-control--BorderRightColor: var(--pf-global--BorderColor--200);
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
`;

class Lookup extends React.Component {
  constructor(props) {
    super(props);

    this.assertCorrectValueType();
    this.state = {
      isModalOpen: false,
      results: [],
      count: 0,
      error: null,
    };
    this.qsConfig = getQSConfig(props.qsNamespace, {
      page: 1,
      page_size: 5,
      order_by: props.sortedColumnKey,
    });
    this.handleModalToggle = this.handleModalToggle.bind(this);
    this.getData = this.getData.bind(this);
  }

  componentDidMount() {
    this.getData();
  }

  componentDidUpdate(prevProps) {
    const { location, selectedCategory } = this.props;
    if (
      location !== prevProps.location ||
      prevProps.selectedCategory !== selectedCategory
    ) {
      this.getData();
    }
  }

  assertCorrectValueType() {
    const { multiple, value, selectCategoryOptions } = this.props;
    if (selectCategoryOptions) {
      return;
    }
    if (!multiple && Array.isArray(value)) {
      throw new Error(
        'Lookup value must not be an array unless `multiple` is set'
      );
    }
    if (multiple && !Array.isArray(value)) {
      throw new Error('Lookup value must be an array if `multiple` is set');
    }
  }

  async getData() {
    const {
      getItems,
      location: { search },
    } = this.props;
    const queryParams = parseQueryString(this.qsConfig, search);

    this.setState({ error: false });
    try {
      const { data } = await getItems(queryParams);
      const { results, count } = data;

      this.setState({
        results,
        count,
      });
    } catch (err) {
      this.setState({ error: true });
    }
  }

  handleModalToggle() {
    const { isModalOpen } = this.state;
    this.setState({
      isModalOpen: !isModalOpen,
    });
  }

  removeItemAndSave(row) {
    const { value, onChange, multiple } = this.props;
    if (multiple) {
      onChange(value.filter(item => item.id !== row.id));
    } else if (value.id === row.id) {
      onChange(null);
    }
  }

  render() {
    const { error, results, count, isModalOpen } = this.state;
    const {
      i18n,
      id,
      lookupHeader,
      value,
      columns,
      multiple,
      name,
      onBlur,
      selectCategory,
      required,
      selectCategoryOptions,
      selectedCategory,
      onChange,
      onToggleItem,
      sortedColumnKey,
      qsNamespace,
    } = this.props;
    const canDelete = !required || (multiple && value.length > 1);
    const chips = () => {
      return selectCategoryOptions && selectCategoryOptions.length > 0 ? (
        <ChipGroup>
          {(multiple ? value : [value]).map(chip => (
            <CredentialChip
              key={chip.id}
              onClick={() => this.removeItemAndSave(chip)}
              isReadOnly={!canDelete}
              credential={chip}
            />
          ))}
        </ChipGroup>
      ) : (
        <ChipGroup>
          {(multiple ? value : [value]).map(chip => (
            <Chip
              key={chip.id}
              onClick={() => this.removeItemAndSave(chip)}
              isReadOnly={!canDelete}
            >
              {chip.name}
            </Chip>
          ))}
        </ChipGroup>
      );
    };
    return (
      <Fragment>
        <InputGroup onBlur={onBlur}>
          <SearchButton
            aria-label="Search"
            id={id}
            onClick={this.handleModalToggle}
            variant={ButtonVariant.tertiary}
          >
            <SearchIcon />
          </SearchButton>
          <ChipHolder className="pf-c-form-control">
            {value ? chips(value) : null}
          </ChipHolder>
        </InputGroup>
        <LookupModal
          onChange={onChange}
          onToggleItem={onToggleItem}
          lookupHeader={lookupHeader}
          value={value}
          multiple={multiple}
          sortedColumnKey={sortedColumnKey}
          isOpen={isModalOpen}
          qsNamespace={qsNamespace}
          toggleModal={() => {
            if (selectedCategory) {
              selectCategory(null, 'Machine');
            }
            this.setState({ isModalOpen: !isModalOpen });
          }}
          renderList={({ selectedItems, addItem, removeItem }) => (
            <Fragment>
              {selectCategoryOptions && selectCategoryOptions.length > 0 && (
                <ToolbarItem css=" display: flex; align-items: center;">
                  <span css="flex: 0 0 25%;">Selected Category</span>
                  <VerticalSeperator />
                  <AnsibleSelect
                    css="flex: 1 1 75%;"
                    id="multiCredentialsLookUp-select"
                    label="Selected Category"
                    data={selectCategoryOptions}
                    value={selectedCategory.label}
                    onChange={selectCategory}
                  />
                </ToolbarItem>
              )}
              {selectedItems.length > 0 && (
                <SelectedList
                  label={i18n._(t`Selected`)}
                  selected={selectedItems}
                  showOverflowAfter={5}
                  onRemove={removeItem}
                  isReadOnly={!canDelete}
                  isCredentialList={
                    selectCategoryOptions && selectCategoryOptions.length > 0
                  }
                />
              )}
              <PaginatedDataList
                items={results}
                itemCount={count}
                pluralizedItemName={lookupHeader}
                qsConfig={this.qsConfig}
                toolbarColumns={columns}
                renderItem={item => (
                  <CheckboxListItem
                    key={item.id}
                    itemId={item.id}
                    name={multiple ? item.name : name}
                    label={item.name}
                    isSelected={selectedItems.some(i => i.id === item.id)}
                    onSelect={() => addItem(item)}
                    isRadio={
                      !multiple ||
                      (selectCategoryOptions &&
                        selectCategoryOptions.length &&
                        selectedCategory.value !== 'Vault')
                    }
                  />
                )}
                renderToolbar={props => (
                  <DataListToolbar {...props} fillWidth />
                )}
                showPageSizeOptions={false}
              />
              {error ? <div>error</div> : ''}
            </Fragment>
          )}
        />
      </Fragment>
    );
  }
}

const Item = shape({
  id: number.isRequired,
});

Lookup.propTypes = {
  id: string,
  getItems: func.isRequired,
  lookupHeader: string,
  name: string,
  onChange: func.isRequired,
  value: oneOfType([Item, arrayOf(Item)]),
  sortedColumnKey: string.isRequired,
  multiple: bool,
  required: bool,
  qsNamespace: string,
};

Lookup.defaultProps = {
  id: 'lookup-search',
  lookupHeader: null,
  name: null,
  value: null,
  multiple: false,
  required: false,
  qsNamespace: 'lookup',
};

export { Lookup as _Lookup };
export default withI18n()(withRouter(Lookup));
