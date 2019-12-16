/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MainContext, MainThreadTimelineServiceShape, IExtHostContext } from 'vs/workbench/api/common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workbench/api/common/extHostCustomers';
import { ITimelineService, TimelineProvider, TimelineItem } from 'vs/workbench/contrib/timeline/common/timeline';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import { CancellationToken } from 'vs/base/common/cancellation';

@extHostNamedCustomer(MainContext.MainThreadTimelineService)
export class MainThreadTimelineService implements MainThreadTimelineServiceShape {

	private readonly _timelineProviders = new Map<number, IDisposable>();

	constructor(
		_: IExtHostContext,
		@ITimelineService private readonly _timelineService: ITimelineService
	) { }

	$getTimeline(resource: URI, since: Date, token: CancellationToken): Promise<TimelineItem[]> {
		return this._timelineService.getTimeline(resource, since, token);
	}

	$registerTimelineProvider(handle: number, provider: TimelineProvider): void {
		const disposable = this._timelineService.registerTimelineProvider(provider);
		this._timelineProviders.set(handle, disposable);
	}

	$unregisterTimelineProvider(handle: number): void {
		dispose(this._timelineProviders.get(handle));
		this._timelineProviders.delete(handle);
	}

	dispose(): void {
		// noop
	}
}
