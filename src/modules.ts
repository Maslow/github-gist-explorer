import * as moment from 'moment';

export class GitHubGist {
	public url: string;
	public forksURL: string;
	public commitsURL: string;
	public id: string;
	public nodeID: string;
	public gitPullURL: string;
	public gitPushURL: string;
	public htmlURL: string;
	public files: Array<GitHubGistFile>;
	public public: string;
	public createdAt: moment.Moment;
	public updatedAt: moment.Moment;
	public description: string;
	public comments: string;
	public user: object;
	public commentsURL: string;
	public owner: GitHubGistOwner;
	public truncated: string;

	constructor(data: any) {
		this.url = data.url;
		this.forksURL = data.forks_url;
		this.commitsURL = data.commits_url;
		this.id = data.id;
		this.nodeID = data.node_id;
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
	}
}

export class GitHubGistFile {
	public gistID: string;
	public filename: string;
	public type: string;
	public language: string;
	public rawURL: string;
	public size: number;

	constructor(gistID: string, data: any) {
		this.gistID = gistID;
		this.filename = data.filename;
		this.type = data.type;
		this.language = data.language;
		this.rawURL = data.raw_url;
		this.size = data.size;
	}
}

export class GitHubGistOwner {
	public login: string;
	public id: number;
	public nodeID: string;
	public avatarURL: string;
	public gravatarID: string;
	public url: string;
	public htmlURL: string;
	public followersURL: string;
	public followingURL: string;
	public gistsURL: string;
	public starredURL: string;
	public subscriptionsURL: string;
	public organizationsURL: string;
	public reposURL: string;
	public eventsURL: string;
	public receivedEventsURL: string;
	public type: string;
	public siteAdmin: boolean;

	constructor(data: any) {
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
