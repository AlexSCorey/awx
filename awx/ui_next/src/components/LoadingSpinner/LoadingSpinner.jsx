import React from 'react';

import { Spinner as PFSpinner } from '@patternfly/react-core';
import styled from 'styled-components';

const Spinner = styled(PFSpinner)`
  position: fixed;
  top: 50%;
  left: 50%;
`;
const UpdatingContent = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 300;
  & + * {
    opacity: 0.5;
  }
`;

const LoadingSpinner = () => (
  <UpdatingContent>
    <Spinner />
  </UpdatingContent>
);
export default LoadingSpinner;
