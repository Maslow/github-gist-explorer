import * as moment from 'moment';

export class GitHubGist {
	id: string;
	label: string;
	nodeID: string;
	url: string;
	forksURL: string;
	commitsURL: string;
	gitPullURL: string;
	gitPushURL: string;
	htmlURL: string;
	files: Array<GitHubGistFile>;
	public: string;
	createdAt: moment.Moment;
	updatedAt: moment.Moment;
	description: string;
	comments: string;
	user: object;
	commentsURL: string;
	owner: GitHubGistOwner;
	truncated: string;

	constructor(data?: any) {
		if (data === undefined) {
			this.label = 'New Gist';
			this.files = new Array();
			this.owner = new GitHubGistOwner();
		} else {
			this.id = data.id;
			this.nodeID = data.node_id;
			this.url = data.url;
			this.forksURL = data.forks_url;
			this.commitsURL = data.commits_url;
			this.gitPullURL = data.git_pull_url;
			this.gitPushURL = data.git_push_url;
			this.htmlURL = data.html_url;
			this.files = Object.keys(data.files).map(k => new GitHubGistFile(data.id, data.files[k]));
			this.public = data.public;
			this.createdAt = moment(data.created_at);
			this.updatedAt = moment(data.updated_at);
			this.description = data.description;
			this.comments = data.comments;
			this.user = data.user;
			this.commentsURL = data.comments_url;
			this.owner = new GitHubGistOwner(data.owner)
			this.truncated = data.truncated;

			if (this.description.length > 0) {
				this.label = this.description;
			} else if (this.files.length === 1) {
				this.label = this.files[0].filename;
			} else if (this.files.length > 0) {
				this.label = `${this.files[0].filename} and ${this.files.length - 1} files`;
			} else {
				this.label = '(Empty Gist)';
			}
		}
	}
}

export class GitHubGistFile {
	gistID: string;
	filename: string;
	type: string;
	language: string;
	rawURL: string;
	size: number;

	constructor(gistID?: string, data?: any) {
		this.gistID = gistID;
		this.filename = data.filename;
		this.type = data.type;
		this.language = data.language;
		this.rawURL = data.raw_url;
		this.size = data.size;
	}
}

export class GitHubGistOwner {
	login: string;
	id: number;
	nodeID: string;
	avatarURL: string;
	gravatarID: string;
	url: string;
	htmlURL: string;
	followersURL: string;
	followingURL: string;
	gistsURL: string;
	starredURL: string;
	subscriptionsURL: string;
	organizationsURL: string;
	reposURL: string;
	eventsURL: string;
	receivedEventsURL: string;
	type: string;
	siteAdmin: boolean;

	constructor(data?: any) {
		if (data !== undefined) {
			this.login = data.login;
			this.id = data.id;
			this.nodeID = data.node_id;
			this.avatarURL = data.avatar_url;
			this.gravatarID = data.gravatar_id;
			this.url = data.url;
			this.htmlURL = data.html_url;
			this.followersURL = data.followers_url;
			this.followingURL = data.following_url;
			this.gistsURL = data.gists_url;
			this.starredURL = data.starred_url;
			this.subscriptionsURL = data.subscriptions_url;
			this.organizationsURL = data.organizations_url;
			this.reposURL = data.repos_url;
			this.eventsURL = data.events_url;
			this.receivedEventsURL = data.received_events_url;
			this.type = data.type;
			this.siteAdmin = data.site_admin;
		}
	}
}
