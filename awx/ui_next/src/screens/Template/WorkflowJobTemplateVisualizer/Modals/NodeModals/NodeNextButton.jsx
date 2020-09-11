import React, { useEffect, useState } from 'react';
import { func, oneOfType, number, shape, string } from 'prop-types';
import { Button } from '@patternfly/react-core';

function NodeNextButton({
  activeStep,
  buttonText,
  onClick,
  onNext,
  triggerNext,
}) {
  const [next, setNext] = useState(0);
  // console.log(next, triggerNext, 'next');
  useEffect(() => {
    if (!triggerNext) {
      return;
    }
    setNext(triggerNext);
    onNext();
  }, [onNext, triggerNext]);

  return (
    <Button
      id="next-node-modal"
      variant="primary"
      type="submit"
      onClick={() => onClick(activeStep)}
      isDisabled={!activeStep.enableNext}
    >
      {buttonText}
    </Button>
  );
}

NodeNextButton.propTypes = {
  activeStep: shape().isRequired,
  buttonText: string.isRequired,
  onClick: func.isRequired,
  onNext: func.isRequired,
  triggerNext: oneOfType([string, number]).isRequired,
};

export default NodeNextButton;
