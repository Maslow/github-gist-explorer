import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

import * as vscode from 'vscode';

import axios, { AxiosRequestConfig } from 'axios';

import { waitfiy } from './waitfiy';

import * as constans from './constans';
import * as modules from './modules';

export default class Gist {
	constructor(public readonly token?: string) {
	}

	createRequestConfig(): AxiosRequestConfig {
		const options: AxiosRequestConfig = {
			headers: {
				'Content-Type': 'application/json'
			}
		}

		if (this.token) {
			options.headers.authorization = `token ${this.token}`;
		}

		return options;
	}

	getFile(url: string): Promise<any> {
		const options: AxiosRequestConfig = this.createRequestConfig();
		options.transformResponse = [
			(data, headers) => {
			  return data;
			}
		];

		return axios.get(url, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.reject(new Error(response.statusText));
				}

				return response.data;
			});
	}

	list(username: string): Promise<modules.GitHubGist[]> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		return axios.get(`${constans.GITHUB_API_URL}/users/${username}/gists`, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.resolve([]);
				}

				return response.data.map(value => new modules.GitHubGist(value));
			});
	}

	listStarred(): Promise<modules.GitHubGist[]> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		return axios.get(`${constans.GITHUB_API_URL}/gists/starred`, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.resolve([]);
				}

				return response.data.map(value => new modules.GitHubGist(value));
			});
	}

	add(type: string, description: string): Promise<modules.GitHubGist> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		const file = constans.CLASSIC_MOVIE_QUOTES[Math.floor(Math.random() * 100)];

		const data = {
			description,
			'public': type === constans.PUBLIC_GIST,
			files: {
				[file.name]: {
					content: file.words
				}
			}
		}

		return axios.post(`${constans.GITHUB_API_URL}/gists`, data, options)
			.then(response => {
				if ((response.status !== 200) && (response.status !== 201)) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve(new modules.GitHubGist(response.data));
			});
	}

	update(gistID: string, description: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		const data = {
			gist_id: gistID,
			description
		};

		return axios.patch(`${constans.GITHUB_API_URL}/gists/${gistID}`, data, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}

	destroy(gistID: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		return axios.delete(`${constans.GITHUB_API_URL}/gists/${gistID}`, options)
			.then(response => {
				if ((response.status !== 200) && (response.status !== 204)) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}

	star(gistID: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		return axios.put(`${constans.GITHUB_API_URL}/gists/${gistID}/star`, null, options)
			.then(response => {
				if ((response.status !== 200) && (response.status !== 204)) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}

	unstar(gistID: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		return axios.delete(`${constans.GITHUB_API_URL}/gists/${gistID}/star`, options)
			.then(response => {
				if ((response.status !== 200) && (response.status !== 204)) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}

	updateFile(gistID: string, filename: string, content: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		const data = {
			files: {
				[filename]: { content }
			},
			gist_id: gistID
		};

		return axios.patch(`${constans.GITHUB_API_URL}/gists/${gistID}`, data, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}

	deleteFile(gistID: string, filename: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		const data = {
			files: {
				[filename]: null
			},
			gist_id: gistID
		};

		return axios.patch(`${constans.GITHUB_API_URL}/gists/${gistID}`, data, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}

	renameFile(gistID: string, filename: string, newFilename: string): Promise<void> {
		const options: AxiosRequestConfig = this.createRequestConfig();

		const data = {
			files: {
				[filename]: {
					filename: newFilename
				}
			},
			gist_id: gistID
		};

		return axios.patch(`${constans.GITHUB_API_URL}/gists/${gistID}`, data, options)
			.then(response => {
				if (response.status !== 200) {
					return Promise.reject(new Error(response.statusText));
				}

				return Promise.resolve();
			});
	}
}

export const getFileWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.downloading_file', 'Downloading file...')}`, getFile);
export const listWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.listing_gist', 'Listing gist...')}`, list);
export const listStarredWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.listing_starred_gist', 'Listing starred gist...')}`, listStarred);
export const addWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.creating_gist', 'Creating gist...')}`, add);
export const updateWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.updating_gist', 'Updating gist...')}`, update);
export const destroyWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.deleting_gist', 'Deleting gist...')}`, destroy);
export const starWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.star_gist', 'Staring gist...')}`, star);
export const unstarWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.unstar_gist', 'Unstaring gist...')}`, unstar);
export const updateFileWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.updating_file', 'Updating file...')}`, updateFile);
export const deleteFileWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.deleting_file', 'Deleting file...')}`, deleteFile);
export const renameFileWaitable = waitfiy(`${constans.EXTENSION_NAME}: ${localize('explorer.renaming_file', 'Renaming file...')}`, renameFile);

export function getFile(url: string): Promise<any> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).getFile(url);
}

export function list(username: string): Promise<modules.GitHubGist[]> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).list(username);
}

export function listStarred(): Promise<modules.GitHubGist[]> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).listStarred();
}

export function add(type: string, description: string): Promise<modules.GitHubGist> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).add(type, description);
}

export function update(gistID: string, description: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).update(gistID, description);
}

export function destroy(gistID: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).destroy(gistID);
}

export function star(gistID: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).star(gistID);
}

export function unstar(gistID: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).unstar(gistID);
}
export function updateFile(gistID: string, filename: string, content: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).updateFile(gistID, filename, content);
}

export function deleteFile(gistID: string, filename: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).deleteFile(gistID, filename);
}

export function renameFile(gistID: string, filename: string, newFilename: string): Promise<void> {
	const token: string = vscode.workspace.getConfiguration('github').get('token');
	return (new Gist(token)).renameFile(gistID, filename, newFilename);
}
