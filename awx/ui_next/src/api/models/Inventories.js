import Base from '../Base';

class Inventories extends Base {
  constructor(http) {
    super(http);
    this.baseUrl = '/api/v2/inventories/';

    this.readAccessList = this.readAccessList.bind(this);
  }

  readAccessList(id, params) {
    return this.http.get(`${this.baseUrl}${id}/access_list/`, {
      params
    });
  }

  readInstanceGroups(id) {
    return this.http.get(`${this.baseUrl}${id}/instance_groups/`)
  }

}

export default Inventories;
