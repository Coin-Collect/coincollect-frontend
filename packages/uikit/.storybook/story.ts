import type { FC } from "react";

export type Story<Props> = FC<Props> & { args?: Partial<Props> };
