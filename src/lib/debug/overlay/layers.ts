export const scrollProgressDebugOverlayLayers = [
    'target',
    'progress',
    'root',
    'margin',
    'intersection'
] as const;

export type ScrollProgressDebugOverlayLayer = (typeof scrollProgressDebugOverlayLayers)[number];

export type ScrollProgressDebugOverlayLayerVisibilityState = Record<
    ScrollProgressDebugOverlayLayer,
    boolean
>;

export interface ScrollProgressDebugOverlayLayerVisibilityController {
    getState: () => ScrollProgressDebugOverlayLayerVisibilityState;
    subscribe: (subscriber: ScrollProgressDebugOverlayLayerVisibilitySubscriber) => () => void;
    setLayerVisible: (layer: ScrollProgressDebugOverlayLayer, visible: boolean) => void;
    setAllLayersVisible: (visible: boolean) => void;
    toggleLayerVisible: (layer: ScrollProgressDebugOverlayLayer) => void;
}

type ScrollProgressDebugOverlayLayerVisibilitySubscriber = (
    state: ScrollProgressDebugOverlayLayerVisibilityState
) => void;

const defaultScrollProgressDebugOverlayLayerVisibilityState: ScrollProgressDebugOverlayLayerVisibilityState =
    {
        target: false,
        progress: false,
        root: false,
        margin: false,
        intersection: false
    };

function createScrollProgressDebugOverlayLayerVisibilityState(
    initialState: Partial<ScrollProgressDebugOverlayLayerVisibilityState> = {}
): ScrollProgressDebugOverlayLayerVisibilityState {
    return {
        ...defaultScrollProgressDebugOverlayLayerVisibilityState,
        ...initialState
    };
}

export function createScrollProgressDebugOverlayLayerVisibilityController(
    initialState: Partial<ScrollProgressDebugOverlayLayerVisibilityState> = {}
): ScrollProgressDebugOverlayLayerVisibilityController {
    const subscribers = new Set<ScrollProgressDebugOverlayLayerVisibilitySubscriber>();

    let state = createScrollProgressDebugOverlayLayerVisibilityState(initialState);

    function getState(): ScrollProgressDebugOverlayLayerVisibilityState {
        return { ...state };
    }

    function notifySubscribers(): void {
        const nextState = getState();

        for (const subscriber of subscribers) {
            subscriber(nextState);
        }
    }

    function setLayerVisible(layer: ScrollProgressDebugOverlayLayer, visible: boolean): void {
        if (state[layer] === visible) {
            return;
        }

        state = {
            ...state,
            [layer]: visible
        };

        notifySubscribers();
    }

    function toggleLayerVisible(layer: ScrollProgressDebugOverlayLayer): void {
        setLayerVisible(layer, !state[layer]);
    }

    function setAllLayersVisible(visible: boolean): void {
        const hasChangedLayer = scrollProgressDebugOverlayLayers.some(
            (layer) => state[layer] !== visible
        );

        if (!hasChangedLayer) {
            return;
        }

        state = scrollProgressDebugOverlayLayers.reduce(
            (nextState, layer) => ({
                ...nextState,
                [layer]: visible
            }),
            state
        );

        notifySubscribers();
    }

    function subscribe(
        subscriber: ScrollProgressDebugOverlayLayerVisibilitySubscriber
    ): () => void {
        subscribers.add(subscriber);
        subscriber(getState());

        return () => {
            subscribers.delete(subscriber);
        };
    }

    return {
        getState,
        subscribe,
        setLayerVisible,
        setAllLayersVisible,
        toggleLayerVisible
    };
}
