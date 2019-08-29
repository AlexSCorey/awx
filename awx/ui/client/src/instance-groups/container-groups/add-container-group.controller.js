function AddContainerGroupController(ToJSON,$scope, $state, models, strings, i18n, CredTypesList) {
  const vm = this || {};
  const {
    instanceGroup,
    credential
  } = models;

  console.log(instanceGroup, 'instanceGroup model')
  vm.mode = 'add'
  vm.strings = strings
  vm.panelTitle = strings.get('state.ADD_CONTAINER_GROUP_BREADCRUMB_LABEL')
  vm.lookUpTitle = strings.get('container.LOOK_UP_TITLE')
  vm.form = instanceGroup.createFormSchema('post')
  vm.form.name.required = true;
  vm.form.credential = {
    type: 'field',
    label: i18n._('Credential'),
    id: 'credential'
  };
  vm.form.credential._resource = 'credential';
  vm.form.credential._route = "instanceGroups.addContainerGroup.credentials"
  vm.form.credential._model = credential
  vm.form.credential._placeholder = strings.get('container.CREDENTIAL_PLACEHOLDER')
  vm.form.credential.required = true
  vm.form.podSpec = podSpecDetails()
  vm.podSpec = {
      type: 'textarea',
      id: 'pod_spec'
  }
  function podSpecDetails () {
    // const podSpec = instanceGroup.get('extra_vars');

    // if (!extraVars) {
    //     return null;
    // }

    // const label = strings.get('labels.EXTRA_VARS');
    // const tooltip = strings.get('tooltips.EXTRA_VARS');
    // const value = parse(extraVars);
    // const disabled = true;
    // const name = 'extra_vars';

    // return { label, tooltip, value, disabled, name };
}

  vm.podSpec.label = strings.get('container.POD_SPEC_LABEL');

  vm.panelTitle = strings.get('container.PANEL_TITLE');


  $scope.$watch('credential', () => {
    if ($scope.credential) {
      vm.form.credential._idFromModal= $scope.credential;
      }
  });
  vm.form.save = (data) => {
    console.log(data, 'save data')
    //navigate to edit screen of form
    // state.go('applications.edit', { application_id: res.data.id }, { reload: true });
    $state.go('instanceGroups.addContainerGroup')
    return instanceGroup.request('post', { data: data });

  };
}


AddContainerGroupController.$inject = [
  'ToJSON',
  '$scope',
  '$state',
  'resolvedModels',
  'InstanceGroupsStrings',
  'i18n',
  'CredTypesList'
];

export default AddContainerGroupController;
