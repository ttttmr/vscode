/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/base/common/event';
import { IDisposable } from 'vs/base/common/lifecycle';
import { ITimelineService, TimelineProvider } from './timeline';
import { ILogService } from 'vs/platform/log/common/log';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { URI } from 'vs/base/common/uri';
import { CancellationToken } from 'vs/base/common/cancellation';

export class TimelineService implements ITimelineService {
	_serviceBrand: undefined;

	private readonly _onDidChangeProviders = new Emitter<void>();
	readonly onDidChangeProviders: Event<void> = this._onDidChangeProviders.event;

	private readonly _providers = new Map<string, TimelineProvider>();

	constructor(@ILogService private readonly logService: ILogService) { }

	async getTimeline(resource: URI, since: Date, token: CancellationToken) {
		const requests = [];

		for (const provider of this._providers.values()) {
			requests.push(provider.provideTimeline(resource, since, token));
		}

		const timelines = await Promise.all(requests);

		const timeline = [];
		for (const items of timelines) {
			// tslint:disable-next-line: triple-equals
			if (items == null || items.length === 0) {
				continue;
			}

			timeline.push(...items);
		}

		timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
		return timeline;
	}

	registerTimelineProvider(provider: TimelineProvider): IDisposable {
		this.logService.trace('TimelineService#registerTimelineProvider');

		if (this._providers.has(provider.id)) {
			throw new Error(`Timeline Provider ${provider.id} already exists.`);
		}

		this._providers.set(provider.id, provider);
		this._onDidChangeProviders.fire();

		return {
			dispose: () => {
				this._providers.delete(provider.id);
				this._onDidChangeProviders.fire();
			}
		};
	}
}

registerSingleton(ITimelineService, TimelineService, true);
