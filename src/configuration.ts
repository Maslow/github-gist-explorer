import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import { workspace } from 'vscode';
import { ConfigurationChangeEvent, ConfigurationTarget } from 'vscode';

import { promisify } from './promisify';

export interface GitHub {
	username: string;
	token: string;
}

export interface Configuration {
	sortBy: string;
	ascending: boolean;

	gitHub: GitHub;
}

export class ConfigurationManager {
	check(): Promise<Configuration> {
		const username: string = this.getGitHub('username');
		if (username.length === 0) {
			const msg = localize('error.github_username_missing', 'Please specify the username of GitHub.');
			return Promise.reject(new Error(msg));
		}

		const token: string = this.getGitHub('token');
		if (token.length === 0) {
			const msg = localize('error.github_token_missing', 'Please specify the token of GitHub.');
			return Promise.reject(new Error(msg));
		}

		const conf: Configuration = {
			sortBy: this.get('sortBy'),
			ascending: this.get<boolean>('ascending'),
			gitHub: {
				username: username,
				token: token,
			}
		}

		return Promise.resolve(conf);
	}

	affects(event: ConfigurationChangeEvent) {
		return event.affectsConfiguration('github.username') || event.affectsConfiguration('github.token');
	}

	get<T>(key: string): T {
		return workspace.getConfiguration('explorer').get<T>(key);
	}

	set(key: string, value: any): Promise<void> {
		return promisify(workspace.getConfiguration('explorer').update, workspace)(key, value, ConfigurationTarget.Global);
	}

	getGitHub<T>(key: string): T {
		return workspace.getConfiguration('github').get<T>(key);
	}

	setGitHub(key: string, value: any): Promise<void> {
		return promisify(workspace.getConfiguration('github').update, workspace)(key, value, ConfigurationTarget.Global);
	}
}

export default new ConfigurationManager();
