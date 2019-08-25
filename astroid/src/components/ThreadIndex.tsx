import { Component, createRef } from 'inferno';

import mousetrap from 'mousetrap';
import * as scrollto from 'scroll-to-element';
import * as moment from 'moment';
import * as cx from 'classnames';

import { finalize, tap, take } from 'rxjs/operators';
import { Thread } from 'models';
import * as hypo from 'hypocloid';

import { findDOMNode } from 'inferno-extras';
import { renderToString } from 'inferno-server';
import ClusterizeJS from 'clusterize.js';

import 'clusterize.js/clusterize.css';
import './ThreadIndex.scss';

interface Props {
  query: string;
}

interface State {
  threads: Thread[];
  selected: string;
}

export class ThreadIndex extends Component<Props, State> {
  public state = {
    threads: new Array<Thread>(),
    selected: undefined
  };

  clusterize = null;
  scrollElem = null;
  contentElem = null;

  constructor(props, context) {
    super(props, context);

    mousetrap.bind ('j', () => {
      const idx = this.state.threads
        .findIndex ((t) => t.id === this.state.selected);

      if (idx >= 0 && idx < this.state.threads.length - 1) {
        this.unselectThread (this.state.selected);
        this.selectThread (this.state.threads[idx + 1].id, idx+1);
      }
    });

    mousetrap.bind ('k', () => {
      const idx = this.state.threads
        .findIndex ((t) => t.id === this.state.selected);

      if (idx > 0) {
        this.unselectThread (this.state.selected);
        this.selectThread (this.state.threads[idx - 1].id, idx-1);
      }
    });

    mousetrap.bind ('1', () =>
      this.selectThread (this.state.threads[0].id, true));

    mousetrap.bind ('0', () =>
      this.selectThread (this.state.threads[this.state.threads.length-1].id, true));

    this.loadThreads();
  }

  private unselectThread (id: string) {
    const el = document.getElementById ("t" + id);
    el.classList.remove ("bg-primary");
    this.setState ({ selected: undefined });
  }

  private selectThread (id: string, idx: number) {
    this.setState ({ selected: id });
    const el = document.getElementById ("t" + id);
    el.classList.add ("bg-primary");
    this.scrollElem.scrollTop = idx * el.scrollHeight;
  }

  componentDidMount () {
    const scrollElem = findDOMNode(this.scrollElem);
    const contentElem = findDOMNode(this.contentElem);

    const rows = this.Rows({threads: this.state.threads, selected: this.state.selected}).map (renderToString);

    this.clusterize = new ClusterizeJS({
      rows: rows,
      scrollElem: scrollElem,
      contentElem: contentElem,
      show_no_data_row: false
    });
  }

  componentWillUnmount() {
    if (this.clusterize) {
      this.clusterize.destroy(true);
      this.clusterize = null;
    }
  }

  public loadThreads = () =>
  {
    console.log ('loading..:', this.props.query);
    this.state.threads.length = 0;
    hypo.getThreads (this.props.query).pipe (
      // take (2),
      tap ((e: Thread[]) => {
        this.state.threads.push (...e);
        this.setState ({
          threads: this.state.threads
        });

        if (this.state.threads.length % 1000 === 0) {
          console.log ("threads:", this.state.threads.length);
        }

        if (this.state.selected === undefined) {
          this.setState ({
            selected: e[0].id
          });
        }

        const rows = this.Rows({threads: e, selected: this.state.selected}).map (renderToString);
        this.clusterize.append (rows);
      }),
      finalize (() => console.log ('done', this.state.threads.length))
    ).subscribe ();
  }

  public Rows (props) {
    const threads = props.threads;
    const selected = props.selected;

    const formatDate = (date: number): JSX.Element => {
      return (<span>{moment (new Date(date * 1000)).fromNow ()}</span>);
    };

    return (
      threads.map ( (thread) => (
        <tr id={"t" + thread.id}
          key={thread.id}
          class={cx ({
              'bg-primary': thread.id === selected,
              'ti-unread': thread.unread })}>
          <td class="ti-date">
            {formatDate (thread.newest_date)}
          </td>
          <td class="ti-authors">
            {thread.authors}
          </td>
          <td>
            <span class={
              cx ('badge', {
                'badge-primary': thread.unread,
                'badge-secondary': !thread.unread
                })}>
              {thread.total_messages}
            </span>
          </td>
          <td class="ti-subject">
            {thread.subject}
          </td>
        </tr>
      ))
    );
  }

  public render() {
    return (
        <div
          ref={node => {
            this.scrollElem = node;
          }}
            class="clusterize-scroll">
          <table class="ti table table-dark table-borderless table-sm">
            <tbody ref={node => { this.contentElem = node }}
            class="clusterize-content">
            </tbody>
          </table>
        </div>
    );
  }
}
