import React, { useCallback, useEffect } from 'react';
import { withI18n } from '@lingui/react';
import { useParams } from 'react-router-dom';
import { t } from '@lingui/macro';
import { Host } from '../../../types';
import { CardBody } from '../../../components/Card';
import { DetailList } from '../../../components/DetailList';
import { VariablesDetail } from '../../../components/CodeMirrorInput';
import ContentError from '../../../components/ContentError';
import ContentLoading from '../../../components/ContentLoading';
import useRequest from '../../../util/useRequest';
import { HostsAPI } from '../../../api';
import { useLoading } from '../../../contexts/Loading';

function HostFacts({ i18n, host }) {
  const { id } = useParams();
  const { isLoading: globalLoading } = useLoading();
  const { result: facts, isLoading, error, request: fetchFacts } = useRequest(
    useCallback(async () => {
      const [{ data: factsObj }] = await Promise.all([HostsAPI.readFacts(id)]);
      return JSON.stringify(factsObj, null, 4);
    }, [id]),
    '{}'
  );

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);
  // console.log(isLoading, globalLoading);
  if (isLoading || globalLoading) {
    console.log('loading');
    return <ContentLoading />;
  }

  if (error) {
    return <ContentError error={error} />;
  }

  return (
    <CardBody>
      {console.log('not loading')}
      <DetailList gutter="sm">
        <VariablesDetail label={i18n._(t`Facts`)} fullHeight value={facts} />
      </DetailList>
    </CardBody>
  );
}

HostFacts.propTypes = {
  host: Host.isRequired,
};

export default withI18n()(HostFacts);
