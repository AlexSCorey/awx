import {
  useState
} from 'react';
import {
  useFormikContext
} from 'formik'
import useInventoryStep from './steps/useInventoryStep';
import useCredentialsStep from './steps/useCredentialsStep';
import useOtherPromptsStep from './steps/useOtherPromptsStep';
import useSurveyStep from './steps/useSurveyStep';
import usePreviewStep from './steps/usePreviewStep';
import useRunTypeStep from './steps/useRunTypeStep';
import useNodeTypeStep from './steps/useNodeTypeStep';

export default function useSteps(config, resource, i18n, askLinkType, isWorkflowNode) {

  const [visited, setVisited] = useState({});
  const steps = [
    useRunTypeStep(askLinkType, i18n),
    useNodeTypeStep(isWorkflowNode, i18n),
    useInventoryStep(config, resource, visited, i18n),
    useCredentialsStep(config, resource, visited, i18n),
    useOtherPromptsStep(config, resource, visited, i18n),
    useSurveyStep(config, resource, visited, i18n),
  ];
  const {
    values: formikValues,
    errors
  } = useFormikContext()
  const formErrorsContent = []

  if (config.ask_inventory_on_launch && !formikValues.inventory) {
    formErrorsContent.push({
      inventory: true
    })
  }
  const hasSurveyError = Object.keys(errors).find(e => e.includes('survey'))

  if (config.survey_enabled &&
    (config.variables_needed_to_start ||
      config.variables_needed_to_start.length === 0) && hasSurveyError) {
    formErrorsContent.push({
      survey: true
    })
  }

  steps.push(
    usePreviewStep(config, resource, steps[3].survey, formErrorsContent, i18n)
  );

  const pfSteps = steps.map(s => s.step).filter(s => s != null);
  const initialValues = steps.reduce((acc, cur) => {
    return {
      ...acc,
      ...cur.initialValues,
    };
  }, {});
  const isReady = !steps.some(s => !s.isReady);

  const stepWithError = steps.find(s => s.contentError);
  const contentError = stepWithError ? stepWithError.contentError : null;

  const validate = values => {
    const validateErrors = steps.reduce((acc, cur) => {
      return {
        ...acc,
        ...cur.validate(values),
      };
    }, {});
    if (Object.keys(validateErrors).length) {
      return validateErrors;
    }
    return validateErrors;
  };

  return {
    steps: pfSteps,
    initialValues,
    isReady,
    validate,
    visitStep: stepId => setVisited({
      ...visited,
      [stepId]: true
    }),
    visitAllSteps: setFieldsTouched => {
      setVisited({
        inventory: true,
        credentials: true,
        other: true,
        survey: true,
        preview: true,
      });
      steps.forEach(s => s.setTouched(setFieldsTouched));
    },
    contentError,
  };
}
