import { it, expect } from 'vitest'
import { Stream } from '../Stream'
import { ErrorWithDetails, captureError } from '../Errors'
import { c_fail } from '../EventType'

it('Stream.fail(Error) auto-captures into ErrorDetails', () => {
    const s = new Stream();
    s.fail(new Error('boom'));

    const events = s.takeBacklog();
    expect(events.length).toBe(1);
    const evt = events[0];
    expect(evt.t).toBe(c_fail);
    if (evt.t === c_fail) {
        expect(evt.error.errorMessage).toBe('boom');
        expect(evt.error.errorId).toBeTruthy();
        expect(evt.error.errorType).toBe('unhandled_exception');
    }
});

it('Stream.closeWithError accepts Error and is a no-op when already closed', () => {
    const s = new Stream();
    s.done();
    // Should not throw even though the stream is closed.
    s.closeWithError(new Error('too late'));
});

it('Stream.closeWithError converts Error to ErrorDetails', () => {
    const s = new Stream();
    s.closeWithError(new Error('normalize me'));

    const events = s.takeBacklog();
    expect(events.length).toBe(1);
    const evt = events[0];
    if (evt.t === c_fail) {
        expect(evt.error.errorMessage).toBe('normalize me');
        expect(evt.error.errorId).toBeTruthy();
    }
});

it('promiseItems rejects with ErrorWithDetails carrying original errorItem', async () => {
    const s = new Stream();
    s.fail({ errorMessage: 'nope', errorType: 'test', errorId: 'err-1' });

    try {
        await s.promiseItems();
        throw new Error('should have rejected');
    } catch (e) {
        expect(e).toBeInstanceOf(ErrorWithDetails);
        const details = (e as ErrorWithDetails).errorItem;
        expect(details.errorMessage).toBe('nope');
        expect(details.errorType).toBe('test');
        expect(details.errorId).toBe('err-1');
    }
});

it('forEach rejects when the callback throws', async () => {
    const s = new Stream<number>();
    s.item(1);
    s.item(2);
    s.done();

    const seen: number[] = [];
    await expect(
        s.forEach((x) => {
            seen.push(x);
            if (x === 2) throw new Error('handler-boom');
        })
    ).rejects.toThrow('handler-boom');
    expect(seen).toEqual([1, 2]);
});

it('forEach rejects on upstream fail', async () => {
    const s = new Stream<number>();
    s.item(1);
    s.fail({ errorMessage: 'stream-boom' });

    await expect(s.forEach(() => {})).rejects.toThrow('stream-boom');
});

it('async iterator rethrows errors as ErrorWithDetails', async () => {
    const s = new Stream<number>();
    s.item(1);
    s.fail({ errorMessage: 'iter-boom', errorType: 'async', errorId: 'err-2' });

    let caught: any = null;
    try {
        for await (const _item of s) {
            // consume
        }
    } catch (e) {
        caught = e;
    }
    expect(caught).toBeInstanceOf(ErrorWithDetails);
    expect((caught as ErrorWithDetails).errorItem.errorId).toBe('err-2');
});

it('captureError roundtrips through Stream.fail -> promiseItems', async () => {
    const original = new ErrorWithDetails({
        errorMessage: 'rt',
        errorType: 'roundtrip',
        errorId: 'rt-1',
        related: [{ request: 'abc' }],
    });

    const s = new Stream();
    s.fail(original);

    try {
        await s.promiseItems();
    } catch (e) {
        const recovered = captureError(e as any);
        expect(recovered.errorMessage).toBe('rt');
        expect(recovered.errorId).toBe('rt-1');
        expect(recovered.errorType).toBe('roundtrip');
        expect(recovered.related).toEqual(
            expect.arrayContaining([expect.objectContaining({ request: 'abc' })])
        );
    }
});
