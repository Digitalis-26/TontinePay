import { RegisteredUser } from '../types';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  defaultCity: string;
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮', defaultCity: 'Abidjan' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳', defaultCity: 'Dakar' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', defaultCity: 'Ouagadougou' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯', defaultCity: 'Cotonou' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱', defaultCity: 'Bamako' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬', defaultCity: 'Lomé' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲', defaultCity: 'Douala' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪', defaultCity: 'Niamey' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳', defaultCity: 'Conakry' },
];

export const INITIAL_USERS: RegisteredUser[] = [];

