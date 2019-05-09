import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import * as vscode from 'vscode';

export class GitHub {
	username: string;
	token: string;
}

export class Configuration {
	gitHub: GitHub = new GitHub();
}

export class ConfigurationManager {
	check(): Promise<Configuration> {
		const username: string = vscode.workspace.getConfiguration('github').get('username');
		if (username.length === 0) {
			const msg = localize('error.github_username_missing', 'Please specify the username of GitHub.');
			return Promise.reject(new Error(msg));
		}

		const token: string = vscode.workspace.getConfiguration('github').get('token');
		if (token.length === 0) {
			const msg = localize('error.github_token_missing', 'Please specify the token of GitHub.');
			return Promise.reject(new Error(msg));
		}

		const conf: Configuration = new Configuration();
		conf.gitHub.username = username;
		conf.gitHub.token = token;

		return Promise.resolve(conf);
	}

	affects(event: vscode.ConfigurationChangeEvent) {
		return event.affectsConfiguration('github.username') || event.affectsConfiguration('github.token');
	}
}

export default new ConfigurationManager();
