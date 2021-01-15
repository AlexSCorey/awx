import React, { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { object } from 'prop-types';
import { CardBody } from '../../../components/Card';
import {
  CredentialsAPI,
  CredentialInputSourcesAPI,
  CredentialTypesAPI,
} from '../../../api';
import ContentError from '../../../components/ContentError';
import ContentLoading from '../../../components/ContentLoading';
import CredentialForm from '../shared/CredentialForm';
import useRequest from '../../../util/useRequest';

function CredentialEdit({ credential, me }) {
  const history = useHistory();

  const { error: submitError, request: submitRequest, result } = useRequest(
    useCallback(
      async (values, credentialTypesMap, inputSourceMap) => {
        const { inputs: credentialTypeInputs } = credentialTypesMap[
          values.credential_type
        ];

        const {
          inputs,
          organization,
          passwordPrompts,
          ...remainingValues
        } = values;

        const nonPluginInputs = {};
        const pluginInputs = {};
        const possibleFields = credentialTypeInputs.fields || [];

        possibleFields.forEach(field => {
          const input = inputs[field.id];
          if (input?.credential && input?.inputs) {
            pluginInputs[field.id] = input;
          } else if (passwordPrompts[field.id]) {
            nonPluginInputs[field.id] = 'ASK';
          } else {
            nonPluginInputs[field.id] = input;
          }
        });

        const createAndUpdateInputSources = () =>
          Object.entries(pluginInputs).map(([fieldName, fieldValue]) => {
            if (!inputSourceMap[fieldName]) {
              return CredentialInputSourcesAPI.create({
                input_field_name: fieldName,
                metadata: fieldValue.inputs,
                source_credential: fieldValue.credential.id,
                target_credential: credential.id,
              });
            }
            if (fieldValue.touched) {
              return CredentialInputSourcesAPI.update(
                inputSourceMap[fieldName].id,
                {
                  metadata: fieldValue.inputs,
                  source_credential: fieldValue.credential.id,
                }
              );
            }

            return null;
          });

        const destroyInputSources = () =>
          Object.values(inputSourceMap).map(inputSource => {
            const { id, input_field_name } = inputSource;
            if (!inputs[input_field_name]?.credential) {
              return CredentialInputSourcesAPI.destroy(id);
            }
            return null;
          });
        const modifiedData = {
          inputs: nonPluginInputs,
          ...remainingValues,
        };
        // can send only one of org, user, team
        if (organization?.id) {
          modifiedData.organization = organization.id;
        } else if (me?.id) {
          modifiedData.user = me.id;
        }
        const [{ data }] = await Promise.all([
          CredentialsAPI.update(credential.id, modifiedData),
          ...destroyInputSources(),
          createAndUpdateInputSources(),
        ]);
        return data;
      },
      [me, credential.id]
    )
  );

  useEffect(() => {
    if (result) {
      history.push(`/credentials/${result.id}/details`);
    }
  }, [result, history]);
  const {
    isLoading,
    error,
    result: { credentialTypes, inputSources },
    request: fetchData,
  } = useRequest(
    useCallback(async () => {
      const [
        {
          data: { results: loadedCredentialTypes },
        },
        {
          data: { results: loadedInputSources },
        },
      ] = await Promise.all([
        CredentialTypesAPI.read({ page_size: 200 }),
        CredentialsAPI.readInputSources(credential.id, { page_size: 200 }),
      ]);
      const credTypes = loadedCredentialTypes.reduce(
        (credentialTypesMap, credentialType) => {
          credentialTypesMap[credentialType.id] = credentialType;
          return credentialTypesMap;
        },
        {}
      );
      const inputTypes = loadedInputSources.reduce(
        (inputSourcesMap, inputSource) => {
          inputSourcesMap[inputSource.input_field_name] = inputSource;
          return inputSourcesMap;
        },
        {}
      );

      return {
        credentialTypes: credTypes,
        inputSources: inputTypes,
      };
    }, [credential.id]),
    { credentialTypes: {}, inputSources: {} }
  );
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleCancel = () => {
    const url = `/credentials/${credential.id}/details`;
    history.push(`${url}`);
  };

  const handleSubmit = async values => {
    await submitRequest(values, credentialTypes, inputSources);
  };

  if (error) {
    return <ContentError error={error} />;
  }

  if (isLoading) {
    return <ContentLoading />;
  }

  return (
    <CardBody>
      <CredentialForm
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        credential={credential}
        credentialTypes={credentialTypes}
        inputSources={inputSources}
        submitError={submitError}
      />
    </CardBody>
  );
}

CredentialEdit.proptype = {
  credential: object.isRequired,
};

export { CredentialEdit as _CredentialEdit };
export default CredentialEdit;
