export type DemoCategory = 'core' | 'experiments' | 'debug' | 'edge';
export type DemoLevel = 'start-here' | 'intermediate' | 'advanced' | 'diagnostics';

export interface DemoAsset {
    path: string;
    content: string;
}

export interface PlaygroundDemo {
    id: string;
    category: DemoCategory;
    title: string;
    order: number;
    level: DemoLevel;
    markup: string;
    style: string;
    typescript: string;
    javascript: string;
    assets?: readonly DemoAsset[];
}
