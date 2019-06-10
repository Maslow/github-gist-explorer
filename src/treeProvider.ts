import i18n from "./i18n";

import { Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

import * as path from "path";

import * as constans from "./constans";
import * as api from "./api";
import * as VSCode from "./vscode";

import waitfiy from "./waitfiy";

import Gist from "./modules/gist";
import File from "./modules/file";

import ConfigurationManager from "./configuration";

export enum GistTreeSortBy {
    Label = "Label",
    LastUpdated = "Last Updated",
    Created = "Created",
}

export default class GistTreeProvider implements TreeDataProvider<GistTreeItem> {
  private readonly onDidChangeTreeDataEmitter: EventEmitter<GistTreeItem | undefined> = new EventEmitter<GistTreeItem | undefined>();
  readonly onDidChangeTreeData: Event<GistTreeItem | undefined> = this.onDidChangeTreeDataEmitter.event;

  private sortBy: string = GistTreeSortBy.LastUpdated;
  private ascending = false;

  private items: Gist[] = new Array();
  private starredItems: Gist[] = new Array();

  refresh(): Promise<void> {
    this.items = [];
    this.starredItems = [];

    return ConfigurationManager.check()
      .then(config => {
        const msg = i18n("explorer.listing_gist");
        return waitfiy(`${constans.EXTENSION_NAME}: ${msg}`, () => {
            return Promise.all([api.list(config.github.username), api.listStarred()]);
          }, this)()
          .then(results => {
            const [all, starred] = results;

            this.items = all.filter(a => starred.findIndex(b => a.id === b.id) === -1);
            this.starredItems = starred;

            return Promise.resolve();
          })
          .catch(error => {
            VSCode.showErrorMessage(error.message);
            return Promise.resolve();
          });
      })
      .catch(error => {
        VSCode.showInformationMessage(error.message);
        VSCode.executeCommand("workbench.action.openSettings", `@ext:${constans.EXTENSION_ID}`);
        return Promise.resolve();
      })
      .finally(() => {
        this.sort();
      });
  }

  sort(sortBy?: string, ascending?: boolean) {
    if (sortBy === undefined) {
      sortBy = this.sortBy;
    } else {
      this.sortBy = sortBy;
    }

    if (ascending === undefined) {
      ascending = this.ascending;
    } else {
      this.ascending = ascending;
    }

    let key = "updatedAt";
    switch (sortBy) {
      case GistTreeSortBy.Label:
        key = "label";
        break;
      case GistTreeSortBy.Created:
        key = "createdAt";
        break;
    }

    const compareFn = function (a, b) {
      const [x, y] = ascending ? [a, b] : [b, a];

      if (typeof x[key].diff === "function") {
        return x[key].diff(y[key]);
      }

      if (x[key] < y[key]) {
        return -1;
      } else if (x[key] > y[key]) {
        return 1;
      }
      return 0;
    };

    this.items = this.items.sort(compareFn);
    this.starredItems = this.starredItems.sort(compareFn);

    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: GistTreeItem): TreeItem {
    return element;
  }

  getChildren(element?: GistTreeItem): GistTreeItem[] {
    if (element) {
      let items: GistTreeItem[] = new Array();
      if (element.metadata instanceof Gist) {
        items = Object.values(element.metadata.files).map(f => new GistTreeItem(f));
      }
      return items;
    } else {
      const items = this.items.map(value => new GistTreeItem(value));
      const starredItems = this.starredItems.map(value => new GistTreeItem(value, true));

      return [...starredItems, ...items];
    }
  }
}

export class GistTreeItem extends TreeItem {
  constructor(
    public readonly metadata: Gist | File,
    public readonly starred?: boolean
  ) {
    super("GistTreeItem", TreeItemCollapsibleState.None);

    if (metadata instanceof File) {
      this.contextValue = "GitHubGistFile";

      this.label = metadata.filename;

      this.command = {
        command: "GitHubGistExplorer.editFile",
        title: "Open GitHub Gist",
        arguments: [this]
      };
    } else {
      this.contextValue = "GitHubGistRoot";
      this.collapsibleState = TreeItemCollapsibleState.Collapsed;

      this.label = metadata.label;

      if (starred) {
        this.contextValue = "GitHubGistRootStarrd";

        this.iconPath = {
          light: path.join(__filename, "../../resources/light/star.svg"),
          dark: path.join(__filename, "../../resources/dark/star.svg")
        };
      } else {
        this.iconPath = {
          light: path.join(__filename, "../../resources/light/folder.svg"),
          dark: path.join(__filename, "../../resources/dark/folder.svg")
        };
      }
    }
  }

  get tooltip(): string {
    return this.metadata instanceof Gist ? this.metadata.url : this.metadata.rawURL;
  }

  get description(): string {
    return this.metadata instanceof Gist ? this.metadata.description : this.metadata.type;
  }

  iconPath = {
    light: path.join(__filename, "../../resources/light/snippet.svg"),
    dark: path.join(__filename, "../../resources/dark/snippet.svg")
  };
}
