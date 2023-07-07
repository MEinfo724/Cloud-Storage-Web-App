import { atomWithStorage } from 'jotai/utils';

import { FileType } from '../views/entities';
export const searchResultsDataAtom = atomWithStorage<FileType[] | null>('searchResults', null);
