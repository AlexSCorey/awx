import React from 'react';
import { mountWithContexts } from '../../../../testUtils/enzymeHelpers';
import InventoryScriptListItem from './InventoryScriptListItem';

const inventoryScript = {
  id: 1,
  type: 'custom_inventory_script',
  url: '/api/v2/inventory_scripts/1/',
  summary_fields: {
    organization: {
      id: 1,
      name: 'Organization 0',
      description: '',
    },
    user_capabilities: {
      edit: true,
      delete: true,
      copy: true,
    },
  },
};
describe('<InventoryScriptListItem />', () => {
  let wrapper;
  afterEach(() => {
    wrapper.unmount();
    jest.clearAllMocks();
  });
  test('should mount properly', () => {
    const onSelect = jest.fn();
    wrapper = mountWithContexts(
      <InventoryScriptListItem
        inventoryScript={inventoryScript}
        isSelected={false}
        onSelect={onSelect}
      />
    );
    expect(wrapper.find('InventoryScriptListItem').length).toBe(1);
  });

  test('all buttons and text fields should render properly', () => {
    const onSelect = jest.fn();
    wrapper = mountWithContexts(
      <InventoryScriptListItem
        inventoryScript={inventoryScript}
        isSelected={false}
        onSelect={onSelect}
        detailUrl="/inventory_scripts/1/details"
      />
    );
    expect(
      wrapper
        .find('Link')
        .at(0)
        .prop('to')
    ).toBe('/inventory_scripts/1/details');
    expect(wrapper.find('DataListCheck').length).toBe(1);
    expect(
      wrapper
        .find('DataListCell')
        .at(1)
        .text()
    ).toBe('Organization 0');

    expect(wrapper.find('CopyButton').length).toBe(1);
    expect(wrapper.find('PencilAltIcon').length).toBe(1);
  });

  test('item should be checked', () => {
    const onSelect = jest.fn();
    wrapper = mountWithContexts(
      <InventoryScriptListItem
        inventoryScript={inventoryScript}
        isSelected
        onSelect={onSelect}
      />
    );
    expect(wrapper.find('DataListCheck').length).toBe(1);
    expect(wrapper.find('DataListCheck').prop('checked')).toBe(true);
  });

  test('should not render edit buttons', async () => {
    const onSelect = jest.fn();
    wrapper = mountWithContexts(
      <InventoryScriptListItem
        inventoryScript={{
          ...inventoryScript,
          summary_fields: {
            organization: { name: 'Organization 0' },
            user_capabilities: { start: true, edit: false, copy: true },
          },
        }}
        isSelected={false}
        onSelect={onSelect}
      />
    );
    expect(
      wrapper.find('Button[aria-label="Edit inventory script"]').length
    ).toBe(0);
  });

  test('should not render copy buttons', async () => {
    const onSelect = jest.fn();
    wrapper = mountWithContexts(
      <InventoryScriptListItem
        inventoryScript={{
          ...inventoryScript,
          summary_fields: {
            organization: { name: 'Organization 0' },
            user_capabilities: { start: true, edit: true, copy: false },
          },
        }}
        isSelected={false}
        onSelect={onSelect}
      />
    );
    expect(
      wrapper.find('Button[aria-label="copy inventory script"]').length
    ).toBe(0);
  });
});
