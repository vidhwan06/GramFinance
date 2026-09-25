export const presentationDictionary = {
  en: {
    reducingMethod: 'Interest is calculated only on the remaining loan balance each month as you repay.',
    flatMethod: 'Interest is calculated on the original base loan amount throughout the full tenure.',
    monthlyText: (emi: string, months: number) => `You would pay approximately ${emi} every month for ${months} months.`,
    interestText: (interest: string, months: number) => `Over the full loan period of ${months} months, you would pay approximately ${interest} in interest.`,
    totalText: (total: string) => `The total cash amount you pay (including principal, interest, and upfront fees) will be ${total}.`,
    disbursementText: (disbursed: string) => `The net amount you will receive in your bank account is ${disbursed}.`,
    estimateDisclaimer: 'Note: These figures are estimates based on the entered assumptions. Exact bank terms may vary.',
    reduceEmiSummary: (newEmi: string, oldEmi: string) => `Prepayment lowers your monthly bill from ${oldEmi} to ${newEmi}, keeping the original tenure unchanged.`,
    reduceTenureSummary: (monthsSaved: number, newTenure: number) => `Prepayment shortens your loan by ${monthsSaved} months, finishing in ${newTenure} months while keeping monthly payment constant.`,
  },
  kn: {
    reducingMethod: 'ಪ್ರತಿ ತಿಂಗಳು ನೀವು ಅಸಲು ಮರುಪಾವತಿಸಿದಂತೆ ಬಾಕಿ ಇರುವ ಮೊತ್ತದ ಮೇಲಷ್ಟೇ ಬಡ್ಡಿ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    flatMethod: 'ಸಂಪೂರ್ಣ ಸಾಲದ ಅವಧಿಯಲ್ಲಿ ಆರಂಭಿಕ ಅಸಲು ಮೊತ್ತದ ಮೇಲೆಯೇ ಬಡ್ಡಿಯನ್ನು ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    monthlyText: (emi: string, months: number) => `ನೀವು ಪ್ರತಿಯೊಂದು ತಿಂಗಳಿಗೆ ಸುಮಾರು ${emi} ರೂಪಾಯಿಗಳನ್ನು ${months} ತಿಂಗಳ ಕಾಲ ಪಾವತಿಸಬೇಕಾಗುತ್ತದೆ.`,
    interestText: (interest: string, months: number) => `ಸಂಪೂರ್ಣ ಸಾಲದ ಅವಧಿಯಲ್ಲಿ (${months} ತಿಂಗಳು), ನೀವು ಅಂದಾಜು ${interest} ರೂಪಾಯಿಗಳನ್ನು ಬಡ್ಡಿಯಾಗಿ ಪಾವತಿಸುತ್ತೀರಿ.`,
    totalText: (total: string) => `ಅಸಲು, ಬಡ್ಡಿ ಮತ್ತು ಶುಲ್ಕ ಸೇರಿದಂತೆ ಒಟ್ಟು ಪಾವತಿಸಬೇಕಾದ ನೈಜ ಮೊತ್ತ ${total}.`,
    disbursementText: (disbursed: string) => `ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ತಲುಪುವ ನೈಜ ಚುಕ್ತಾ ಮೊತ್ತ ${disbursed}.`,
    estimateDisclaimer: 'ಸೂಚನೆ: ಇವು ನೀವು ನಮೂದಿಸಿದ ಅಂಕಿಅಂಶಗಳ ಆಧಾರದ ಮೇಲೆ ಮಾಡಿದ ಅಂದಾಜು ಲೆಕ್ಕಾಚಾರಗಳಾಗಿವೆ. ಬ್ಯಾಂಕ್‌ನ ನಿಯಮಗಳು ಬದಲಾಗಬಹುದು.',
    reduceEmiSummary: (newEmi: string, oldEmi: string) => `ಮುಂಗಡ ಪಾವತಿಯು ನಿಮ್ಮ ತಿಂಗಳ ಕಂತನ್ನು ${oldEmi} ರಿಂದ ${newEmi} ಗೆ ಕಡಿಮೆ ಮಾಡುತ್ತದೆ, ಸಾಲದ ಅವಧಿ ಬದಲಾಗುವುದಿಲ್ಲ.`,
    reduceTenureSummary: (monthsSaved: number, newTenure: number) => `ಮುಂಗಡ ಪಾವತಿಯು ನಿಮ್ಮ ಸಾಲದ ಅವಧಿಯನ್ನು ${monthsSaved} ತಿಂಗಳುಗಳಷ್ಟು ಕಡಿಮೆ ಮಾಡಿ, ${newTenure} ತಿಂಗಳಲ್ಲಿ ಮುಕ್ತಾಯಗೊಳಿಸುತ್ತದೆ.`,
  },
};
