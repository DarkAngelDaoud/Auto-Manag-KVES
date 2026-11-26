'use strict';
/* Auto Manag KVES · signé KVES · constantes et règles légales par défaut (modifiables dans l'application : Plus, Règles légales). Règles légales en DH ; montants des opérations en centimes. */
const APP_VERSION='1.5.4',PW_ITER=600000,RK_ITER=100000,AUTOLOCK_MS=5*60*1000,DAY=864e5;
const DONNEES={params:{taux:1,plafond:200000,tauxCommerce:0.5,plafondCommerce:500000,alerte:80,seuilClient:80000,retenue:30,penalite:100,alerteJours:7,
 echeances:[{t:'T1',l:'Janvier à mars',md:'04-30'},{t:'T2',l:'Avril à juin',md:'07-31'},{t:'T3',l:'Juillet à septembre',md:'10-31'},{t:'T4',l:'Octobre à décembre',md:'01-31'}]}};
