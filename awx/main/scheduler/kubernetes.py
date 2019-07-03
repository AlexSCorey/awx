import time

from django.conf import settings
from kubernetes.client import Configuration as kubeconfig
from kubernetes.client import CoreV1Api as v1_kube_api
from kubernetes.client import ApiClient as kube_api_client
from kubernetes.client.rest import ApiException
from django.utils.functional import cached_property

from awx.main.utils.common import parse_yaml_or_json
from awx.main.utils import (
    create_temporary_fifo,
)


class PodManager(object):

    def __init__(self, task=None):
        self.task = task

    def deploy(self):
        if not self.credential.kubernetes:
            raise RuntimeError('Pod deployment cannot occur without a Kubernetes credential')

        try:
            self.kube_api.create_namespaced_pod(body=self.pod_definition,
                                                namespace=self.namespace)
        except ApiException:
            # TODO: Logging
            raise

        # We don't do any fancy timeout logic here because it is handled
        # at a higher level in the job spawning process. See
        # settings.AWX_ISOLATED_LAUNCH_TIMEOUT and settings.AWX_ISOLATED_CONNECTION_TIMEOUT
        while True:
            pod = self.kube_api.read_namespaced_pod(name=self.pod_name,
                                                    namespace=self.namespace)
            if pod.status.phase != 'Pending':
                break
            time.sleep(1)

        if pod.status.phase == 'Running':
            return pod
        else:
            raise RuntimeError(f"Unhandled Pod phase: {pod.status.phase}")


    def delete(self):
        return self.kube_api.delete_namespaced_pod(name=self.pod_name,
                                                   namespace=self.namespace)

    @property
    def namespace(self):
        return self.pod_definition['metadata']['namespace']

    @property
    def credential(self):
        return self.task.instance_group.credential

    @cached_property
    def kube_config(self):
        return generate_tmp_kube_config(self.credential, self.namespace)

    @cached_property
    def kube_api(self):
        my_client = config.new_client_from_config(config_file=self.kube_config)
        return client.CoreV1Api(api_client=my_client)

    @property
    def pod_name(self):
        return f"job-{self.task.id}"

    @property
    def pod_definition(self):
        default_pod_spec = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {
                "namespace": settings.AWX_CONTAINER_GROUP_DEFAULT_NAMESPACE
            },
            "spec": {
                "containers": [{
                    "image": settings.AWX_CONTAINER_GROUP_DEFAULT_IMAGE,
                    "tty": True,
                    "stdin": True,
                    "imagePullPolicy": "Always",
                    "args": [
                        'sleep', 'infinity'
                    ]
                }]
            }
        }

        pod_spec_override = {}
        if self.task and self.task.instance_group.pod_spec_override:
            pod_spec_override = parse_yaml_or_json(
                self.task.instance_group.pod_spec_override)
        pod_spec = {**default_pod_spec, **pod_spec_override}

        if self.task:
            pod_spec['metadata']['name'] = self.pod_name
            pod_spec['spec']['containers'][0]['name'] = self.pod_name

        return pod_spec


def generate_tmp_kube_config(credential, namespace):
    host_input = credential.get_input('host')
    config = {
        "apiVersion": "v1",
        "kind": "Config",
        "preferences": {},
        "clusters": [
            {
                "name": host_input,
                "cluster": {
                    "server": host_input
                }
            }
        ],
        "users": [
            {
                "name": host_input,
                "user": {
                    "token": credential.get_input('bearer_token')
                }
            }
        ],
        "contexts": [
            {
                "name": host_input,
                "context": {
                    "cluster": host_input,
                    "user": host_input,
                    "namespace": namespace
                }
            }
        ],
        "current-context": host_input
    }

    if credential.get_input('verify_ssl'):
        config["clusters"][0]["cluster"]["certificate-authority-data"] = b64encode(
            credential.get_input('ssl_ca_cert').encode() # encode to bytes
        ).decode() # decode the base64 data into a str
    else:
        config["clusters"][0]["cluster"]["insecure-skip-tls-verify"] = True

    fd, path = tempfile.mkstemp(prefix='kubeconfig')
    with open(path, 'wb') as temp:
        temp.write(yaml.dump(config).encode())
        temp.flush()
    return path
