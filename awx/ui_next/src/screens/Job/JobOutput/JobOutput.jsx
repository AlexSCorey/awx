import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { withI18n } from '@lingui/react';
import { t } from '@lingui/macro';
import styled from 'styled-components';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  InfiniteLoader,
  List,
} from 'react-virtualized';

import AlertModal from '../../../components/AlertModal';
import { CardBody } from '../../../components/Card';
import ContentError from '../../../components/ContentError';
import ContentLoading from '../../../components/ContentLoading';
import ErrorDetail from '../../../components/ErrorDetail';
import StatusIcon from '../../../components/StatusIcon';

import JobEvent from './JobEvent';
import JobEventSkeleton from './JobEventSkeleton';
import PageControls from './PageControls';
import HostEventModal from './HostEventModal';
import { HostStatusBar, OutputToolbar } from './shared';
import {
  JobsAPI,
  ProjectUpdatesAPI,
  SystemJobsAPI,
  WorkflowJobsAPI,
  InventoriesAPI,
  AdHocCommandsAPI,
} from '../../../api';

const HeaderTitle = styled.div`
  display: inline-flex;
  align-items: center;
  h1 {
    margin-left: 10px;
    font-weight: var(--pf-global--FontWeight--bold);
  }
`;

const OutputHeader = styled.div`
  display: flex;
  justify-content: space-between;
`;

const OutputWrapper = styled.div`
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  font-family: monospace;
  font-size: 15px;
  height: calc(100vh - 350px);
  outline: 1px solid #d7d7d7;
`;

const OutputFooter = styled.div`
  background-color: #ebebeb;
  border-right: 1px solid #d7d7d7;
  width: 75px;
  flex: 1;
`;

let ws;
function connectJobSocket({ type, id }, onMessage) {
  ws = new WebSocket(`wss://${window.location.host}/websocket/`);

  ws.onopen = () => {
    const xrftoken = `; ${document.cookie}`
      .split('; csrftoken=')
      .pop()
      .split(';')
      .shift();
    const eventGroup = `${type}_events`;
    ws.send(
      JSON.stringify({
        xrftoken,
        groups: { jobs: ['summary', 'status_changed'], [eventGroup]: [id] },
      })
    );
  };

  ws.onmessage = e => {
    onMessage(JSON.parse(e.data));
  };

  ws.onclose = e => {
    // eslint-disable-next-line no-console
    console.debug('Socket closed. Reconnecting...', e);
    setTimeout(() => {
      connectJobSocket({ type, id }, onMessage);
    }, 1000);
  };

  ws.onerror = err => {
    // eslint-disable-next-line no-console
    console.debug('Socket error: ', err, 'Disconnecting...');
    ws.close();
  };
}

function range(low, high) {
  const numbers = [];
  for (let n = low; n <= high; n++) {
    numbers.push(n);
  }
  return numbers;
}

class JobOutput extends Component {
  constructor(props) {
    super(props);
    this.listRef = React.createRef();
    this.state = {
      contentError: null,
      deletionError: null,
      hasContentLoading: true,
      results: {},
      currentlyLoading: [],
      remoteRowCount: 0,
      isHostModalOpen: false,
      isPageCollapsed: false,
      hostEvent: {},
      collapsedTaskUuids: [],
      collapsedPlayUuids: [],
    };

    this.cache = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 25,
    });

    this._isMounted = false;
    this.loadJobEvents = this.loadJobEvents.bind(this);
    this.handleDeleteJob = this.handleDeleteJob.bind(this);
    this.rowRenderer = this.rowRenderer.bind(this);
    this.handleHostEventClick = this.handleHostEventClick.bind(this);
    this.handleHostModalClose = this.handleHostModalClose.bind(this);
    this.handleScrollFirst = this.handleScrollFirst.bind(this);
    this.handleScrollLast = this.handleScrollLast.bind(this);
    this.handleScrollNext = this.handleScrollNext.bind(this);
    this.handleScrollPrevious = this.handleScrollPrevious.bind(this);
    this.handlePlayToggle = this.handlePlayToggle.bind(this);
    this.handlePageToggle = this.handlePageToggle.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.isRowLoaded = this.isRowLoaded.bind(this);
    this.loadMoreRows = this.loadMoreRows.bind(this);
    this.scrollToRow = this.scrollToRow.bind(this);
    this.monitorJobSocketCounter = this.monitorJobSocketCounter.bind(this);
  }

  componentDidMount() {
    const { job } = this.props;
    this._isMounted = true;
    this.loadJobEvents();

    connectJobSocket(job, data => {
      if (data.counter && data.counter > this.jobSocketCounter) {
        this.jobSocketCounter = data.counter;
      } else if (data.final_counter && data.unified_job_id === job.id) {
        this.jobSocketCounter = data.final_counter;
      }
    });
    this.interval = setInterval(() => this.monitorJobSocketCounter(), 5000);
  }

  componentDidUpdate(prevProps, prevState) {
    // recompute row heights for any job events that have transitioned
    // from loading to loaded
    const { currentlyLoading } = this.state;
    let shouldRecomputeRowHeights = false;
    prevState.currentlyLoading
      .filter(n => !currentlyLoading.includes(n))
      .forEach(n => {
        shouldRecomputeRowHeights = true;
        this.cache.clear(n);
      });
    if (shouldRecomputeRowHeights) {
      if (this.listRef.recomputeRowHeights) {
        this.listRef.recomputeRowHeights();
      }
    }
  }

  componentWillUnmount() {
    if (ws) {
      ws.close();
    }
    clearInterval(this.interval);
    this._isMounted = false;
  }

  monitorJobSocketCounter() {
    const { remoteRowCount } = this.state;
    if (this.jobSocketCounter >= remoteRowCount) {
      this._isMounted &&
        this.setState({ remoteRowCount: this.jobSocketCounter + 1 });
    }
  }

  async loadJobEvents() {
    const { job, type } = this.props;

    const loadRange = range(1, 50);
    this._isMounted &&
      this.setState(({ currentlyLoading }) => ({
        hasContentLoading: true,
        currentlyLoading: currentlyLoading.concat(loadRange),
      }));
    try {
      const {
        data: { results: newResults = [], count },
      } = await JobsAPI.readEvents(job.id, type, {
        page_size: 50,
        order_by: 'start_line',
      });
      this._isMounted &&
        this.setState(({ results }) => {
          newResults.forEach(jobEvent => {
            results[jobEvent.counter] = jobEvent;
          });
          return { results, remoteRowCount: count + 1 };
        });
    } catch (err) {
      this.setState({ contentError: err });
    } finally {
      this._isMounted &&
        this.setState(({ currentlyLoading }) => ({
          hasContentLoading: false,
          currentlyLoading: currentlyLoading.filter(
            n => !loadRange.includes(n)
          ),
        }));
    }
  }

  async handleDeleteJob() {
    const { job, history } = this.props;
    try {
      switch (job.type) {
        case 'project_update':
          await ProjectUpdatesAPI.destroy(job.id);
          break;
        case 'system_job':
          await SystemJobsAPI.destroy(job.id);
          break;
        case 'workflow_job':
          await WorkflowJobsAPI.destroy(job.id);
          break;
        case 'ad_hoc_command':
          await AdHocCommandsAPI.destroy(job.id);
          break;
        case 'inventory_update':
          await InventoriesAPI.destroy(job.id);
          break;
        default:
          await JobsAPI.destroy(job.id);
      }
      history.push('/jobs');
    } catch (err) {
      this.setState({ deletionError: err });
    }
  }

  isRowLoaded({ index }) {
    const { results, currentlyLoading } = this.state;
    if (results[index]) {
      return true;
    }
    return currentlyLoading.includes(index);
  }

  handleHostEventClick(hostEvent) {
    this.setState({
      isHostModalOpen: true,
      hostEvent,
    });
  }

  handleHostModalClose() {
    this.setState({
      isHostModalOpen: false,
    });
  }

  handleTaskToggle(task_uuid) {
    if (!task_uuid) return;

    const { collapsedTaskUuids } = this.state;

    if (collapsedTaskUuids.includes(task_uuid)) {
      this.setState({
        collapsedTaskUuids: collapsedTaskUuids.filter(u => u !== task_uuid),
      });
    } else {
      this.setState({
        collapsedTaskUuids: collapsedTaskUuids.concat(task_uuid),
      });
    }

    this.cache.clearAll();
    this.listRef.recomputeRowHeights();
    this.listRef.forceUpdateGrid();
  }

  handlePlayToggle(play_uuid) {
    const { collapsedPlayUuids, collapsedTaskUuids, results } = this.state;
    // for each new play_uuid(these are newly collapsed plays):
    //   this.collapsedPlayUuids.appendWithoutDuplicates(play_uuid)
    // for result in this.results: loop through results
    //   if result.event_level == TASK: if result is a task
    //     if result.event_data.play_uuid == play_uuid: if the play uuid of the result is the same as the play_uuid
    //       this.collapsedTaskUuids.appendWithoutDuplicates(result.event_data.task_uuid) add the result to collapsed tasks without duplicates

    // for each removed play_uuid(these are newly expanded plays):

    Object.values(results).filter(result => {
      const collapsedTaskIndex = collapsedTaskUuids.findIndex(
        collapsedTask => collapsedTask === result.event_data.task_uuid
      );
      let collapsedTasks;
      if (result.event_level === 2) {
        if (
          result.event_data.play_uuid === play_uuid &&
          collapsedTaskIndex === -1
        ) {
          this.setState({
            collapsedTaskUuids: collapsedTaskUuids.concat(
              result.event_data.task_uuid
            ),
          });
        }
      }
      return collapsedTasks;
    });
    const collapsedPlayIndex = collapsedPlayUuids.findIndex(
      collapsedPlay => collapsedPlay === play_uuid
    );
    if (collapsedPlayIndex === -1) {
      this.setState({
        collapsedPlayUuids: collapsedPlayUuids.concat(play_uuid),
      });
    } else {
      this.setState({
        collapsedPlayUuids: collapsedPlayUuids.filter(cP => cP !== play_uuid),
      });
    }

    this.cache.clearAll();
    this.listRef.recomputeRowHeights();
    this.listRef.forceUpdateGrid();
  }

  handlePageToggle() {
    const { results, pageIsExpanded } = this.state;
    // collapse all plays and tasks, yet render both event lines that have the togggle
    // don't collapse that play recap
    //on expand, expand all plays and tasks

    //loop through results and find event_level 1. send that play_uuid to togglePlayUUID
    // let that function collapse the tasks
    //for expand just set state of both playuuids and taskuuids to empty arrays and for update

    if (pageIsExpanded) {
      Object.values(results).forEach(result => {
        if (result.event_level === 1) {
          this.handlePlayToggle(result.event_data.play_uuid);
        }
      });
    } else {
      this.setState({ collapsedPlayUuids: [], collapsedTaskUuids: [] });
    }
  }

  rowRenderer({ index, parent, key, style }) {
    const { results, collapsedTaskUuids, collapsedPlayUuids } = this.state;

    const isHostEvent = jobEvent => {
      const { event, event_data, host, type } = jobEvent;
      let isHost;
      if (typeof host === 'number' || (event_data && event_data.res)) {
        isHost = true;
      } else if (
        type === 'project_update_event' &&
        event !== 'runner_on_skipped' &&
        event_data.host
      ) {
        isHost = true;
      } else {
        isHost = false;
      }
      return isHost;
    };

    const uuid = results[index]?.uuid;
    const taskUuid = results[index]?.event_data?.task_uuid;
    const playUuid = results[index]?.event_data?.play_uuid;
    const isTaskCollapsed = collapsedTaskUuids.includes(taskUuid);
    const isPlayCollapsed = collapsedPlayUuids.includes(playUuid);

    let cellContent = null;

    if (!isTaskCollapsed || (uuid === taskUuid && !isPlayCollapsed)) {
      cellContent = results[index] ? (
        <JobEvent
          isClickable={isHostEvent(results[index])}
          onJobEventClick={() => this.handleHostEventClick(results[index])}
          className="row"
          style={style}
          onTaskToggle={() => this.handleTaskToggle(taskUuid)}
          onPlayToggle={() => this.handlePlayToggle(playUuid)}
          isCollapsed={isTaskCollapsed || isPlayCollapsed}
          {...results[index]}
        />
      ) : (
        <JobEventSkeleton
          className="row"
          style={style}
          counter={index}
          contentLength={80}
        />
      );
    } else {
      cellContent = (
        <div style={{ lineHeight: 1, height: 0, visibility: 'hidden' }} />
      );
    }

    return (
      <CellMeasurer
        key={key}
        cache={this.cache}
        parent={parent}
        rowIndex={index}
        columnIndex={0}
      >
        {cellContent}
      </CellMeasurer>
    );
  }

  loadMoreRows({ startIndex, stopIndex }) {
    if (startIndex === 0 && stopIndex === 0) {
      return Promise.resolve(null);
    }
    const { job, type } = this.props;

    const loadRange = range(startIndex, stopIndex);
    this._isMounted &&
      this.setState(({ currentlyLoading }) => ({
        currentlyLoading: currentlyLoading.concat(loadRange),
      }));
    const params = {
      counter__gte: startIndex,
      counter__lte: stopIndex,
      order_by: 'start_line',
    };

    return JobsAPI.readEvents(job.id, type, params).then(response => {
      this._isMounted &&
        this.setState(({ results, currentlyLoading }) => {
          response.data.results.forEach(jobEvent => {
            results[jobEvent.counter] = jobEvent;
          });
          return {
            results,
            currentlyLoading: currentlyLoading.filter(
              n => !loadRange.includes(n)
            ),
          };
        });
    });
  }

  scrollToRow(rowIndex) {
    this.listRef.scrollToRow(rowIndex);
  }

  handleScrollPrevious() {
    const startIndex = this.listRef.Grid._renderedRowStartIndex;
    const stopIndex = this.listRef.Grid._renderedRowStopIndex;
    const scrollRange = stopIndex - startIndex + 1;
    this.scrollToRow(Math.max(0, startIndex - scrollRange));
  }

  handleScrollNext() {
    const stopIndex = this.listRef.Grid._renderedRowStopIndex;
    this.scrollToRow(stopIndex - 1);
  }

  handleScrollFirst() {
    this.scrollToRow(0);
  }

  handleScrollLast() {
    const { remoteRowCount } = this.state;
    this.scrollToRow(remoteRowCount - 1);
  }

  handleResize({ width }) {
    if (width !== this._previousWidth) {
      this.cache.clearAll();
      this.listRef.recomputeRowHeights();
    }
    this._previousWidth = width;
  }

  render() {
    const { job, i18n } = this.props;

    const {
      contentError,
      deletionError,
      hasContentLoading,
      hostEvent,
      isHostModalOpen,
      remoteRowCount,
      isPageCollapsed,
    } = this.state;

    if (hasContentLoading) {
      return <ContentLoading />;
    }

    if (contentError) {
      return <ContentError error={contentError} />;
    }

    return (
      <CardBody>
        {isHostModalOpen && (
          <HostEventModal
            onClose={this.handleHostModalClose}
            isOpen={isHostModalOpen}
            hostEvent={hostEvent}
          />
        )}
        <OutputHeader>
          <HeaderTitle>
            <StatusIcon status={job.status} />
            <h1>{job.name}</h1>
          </HeaderTitle>
          <OutputToolbar job={job} onDelete={this.handleDeleteJob} />
        </OutputHeader>
        <HostStatusBar counts={job.host_status_counts} />
        <PageControls
          onScrollFirst={this.handleScrollFirst}
          onScrollLast={this.handleScrollLast}
          onScrollNext={this.handleScrollNext}
          onScrollPrevious={this.handleScrollPrevious}
          onPlusClick={this.handlePlusClick}
          onhandlePageToggle={this.handlePageToggle}
          isPageCollapsed={isPageCollapsed}
        />
        <OutputWrapper>
          <InfiniteLoader
            isRowLoaded={this.isRowLoaded}
            loadMoreRows={this.loadMoreRows}
            rowCount={remoteRowCount}
          >
            {({ onRowsRendered, registerChild }) => (
              <AutoSizer onResize={this.handleResize}>
                {({ width, height }) => {
                  return (
                    <List
                      ref={ref => {
                        this.listRef = ref;
                        registerChild(ref);
                      }}
                      deferredMeasurementCache={this.cache}
                      height={height || 1}
                      onRowsRendered={onRowsRendered}
                      rowCount={remoteRowCount}
                      rowHeight={this.cache.rowHeight}
                      rowRenderer={this.rowRenderer}
                      scrollToAlignment="start"
                      width={width || 1}
                      overscanRowCount={20}
                    />
                  );
                }}
              </AutoSizer>
            )}
          </InfiniteLoader>
          <OutputFooter />
        </OutputWrapper>
        {deletionError && (
          <AlertModal
            isOpen={deletionError}
            variant="danger"
            onClose={() => this.setState({ deletionError: null })}
            title={i18n._(t`Job Delete Error`)}
            label={i18n._(t`Job Delete Error`)}
          >
            <ErrorDetail error={deletionError} />
          </AlertModal>
        )}
      </CardBody>
    );
  }
}

export { JobOutput as _JobOutput };
export default withI18n()(withRouter(JobOutput));
