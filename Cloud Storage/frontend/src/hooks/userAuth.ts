import { UserCredential } from 'firebase/auth';
import { atomWithStorage } from 'jotai/utils';
export const userDataAtom = atomWithStorage<UserCredential | null>('userData', null);
