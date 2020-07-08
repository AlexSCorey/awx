import React from 'react';

import { mountWithContexts } from '../../../testUtils/enzymeHelpers';

import InventoryScripts from './InventoryScripts';

describe('<InventoryScripts />', () => {
  let pageWrapper;
  let title;

  beforeEach(() => {
    pageWrapper = mountWithContexts(<InventoryScripts />);
    title = pageWrapper.find('Title');
  });

  afterEach(() => {
    pageWrapper.unmount();
  });

  test('initially renders without crashing', () => {
    expect(pageWrapper.length).toBe(1);
    expect(title.length).toBe(1);
    expect(title.props().size).toBe('2xl');
  });
});
