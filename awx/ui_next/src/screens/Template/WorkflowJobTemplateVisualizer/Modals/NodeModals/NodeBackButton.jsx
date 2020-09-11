import React, { useEffect } from 'react';
import { func, oneOfType, number, shape, string } from 'prop-types';
import { Button } from '@patternfly/react-core';

function NodeBackButton({
  activeStep,
  buttonText,
  onClick,
  onBack,
  triggerNext,
}) {
  useEffect(() => {
    if (
      !triggerNext ||
      (triggerNext === activeStep.key && activeStep.key > 0)
    ) {
      return;
    }
    console.log(triggerNext, activeStep.key, 'back');
    onBack();
  }, [onBack, triggerNext]);

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

NodeBackButton.propTypes = {
  activeStep: shape().isRequired,
  buttonText: string.isRequired,
  onClick: func.isRequired,
  onBack: func.isRequired,
  triggerNext: oneOfType([string, number]).isRequired,
};

export default NodeBackButton;
