# DHIS2 Data Elements Reference

This document provides a complete reference of all data elements, category combinations, and category options for the Primary School inspection forms.

## Data Element Categories

### 📚 Resources (Books)

#### EMIS - Primary Books
- **Data Element ID**: `FaAsIdQC3GM`
- **Category Combo**: Subject/PRI Grade (`vsSJN345Div`)

**Subjects**:
- Subject 1: `Dd487guoOmX`
- Subject 2: `lYBtcThUEeP`
- Subject 3: `yNx1kitVxKi`
- Subject 4: `zP4VTz5YCkU`

**Grade Levels**:
- Level 1: `MhJfImsjR9r`
- Level 2: `HitjwcPPMpP`
- Level 3: `TMvYMcamflE`
- Level 4: `DusJpbNnyvt`
- Level 5: `sKYeKKydndx`
- Level 6: `dejbdNn7222`
- Level 7: `gLljPAO7F5S`

**Total combinations**: 4 subjects × 7 grades = 28 data points

---

### 👨‍🏫 Staff (Teachers)

#### EMIS - Primary Certified Teachers
- **Data Element ID**: `Zy2bdINTA6W`
- **Category Combo**: Sex (`zpnSu9h36wb`)
- **Categories**:
  - Male: `vpmsp7XY31l`
  - Female: `ynJYpoaorSz`

#### EMIS - Qualified Teachers PRI
- **Data Element ID**: `RJi5MW86kCs`
- **Category Combo**: Sex (`zpnSu9h36wb`)
- **Categories**:
  - Male: `vpmsp7XY31l`
  - Female: `ynJYpoaorSz`

#### EMIS - Primary Teachers qualified in Science
- **Data Element ID**: `nEVfdbTkSTy`
- **Category Combo**: Sex (`zpnSu9h36wb`)
- **Categories**:
  - Male: `vpmsp7XY31l`
  - Female: `ynJYpoaorSz`

#### EMIS - Sex of Headteacher (male)
- **Data Element ID**: `rZsnwLbpZGf`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

#### EMIS - Sex of Headteacher (female)
- **Data Element ID**: `iYaJT96ZZ3T`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

**Total**: 8 data points

---

### 🎓 Students (Learners)

#### EMIS - Primary Learners in the reporting year
- **Data Element ID**: `ue3QIMOAC7G`
- **Category Combo**: PRI Grade/PRI Age (<6 - >13 years)/Sex (`mXGVn6FhDXR`)

**Grade Levels**:
- Level 1: `MhJfImsjR9r`
- Level 2: `HitjwcPPMpP`
- Level 3: `TMvYMcamflE`
- Level 4: `DusJpbNnyvt`
- Level 5: `sKYeKKydndx`
- Level 6: `dejbdNn7222`
- Level 7: `gLljPAO7F5S`

**Age Groups**:
- <6 years: `l9S7rWMl3YT`
- 6 years: `Ry39HvEvCBi`
- 7 years: `S0rLn0u934s`
- 8 years: `zdld68g3pMT`
- 9 years: `KFlyetHIzg1`
- 10 years: `exwSfkudJj5`
- 11 years: `aNbgvTYL3hz`
- 12 years: `rbjLVDOP6ln`
- 13 years: `X1VjhyqNwCx`
- >13 years: `Ww4f8hqV0UA`

**Sex**:
- Male: `vpmsp7XY31l`
- Female: `ynJYpoaorSz`

**Total combinations**: 7 grades × 10 age groups × 2 sexes = 140 data points

#### EMIS - SNE Learners PRI (Special Needs Education)
- **Data Element ID**: `kN4ePtUhIL9`
- **Category Combo**: PRI Grade / SNE Domain / Sex

**Grade Levels**: (same as above)

**SNE Domains**:
- Vision: `WGUbjiajdlc`
- Hearing: `miSVWQVu1gl`
- Mobility: `IZGfKLlu7Oz`
- Communication: `tbhrcGWzVeU`
- Cognition / remembering: `BZmx3UM8Wuj`
- Upper body: `QWrjOCytRuS`
- Learning / Understanding: `UkapwFg1K4o`

**Sex**: (same as above)

**Total combinations**: 7 grades × 7 SNE domains × 2 sexes = 98 data points

#### EMIS - Primary Learners that graduated from previous year
- **Data Element ID**: `aSXfIO4Ppi4`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

**Total**: 239 data points

---

### 🏫 Facilities (Infrastructure)

#### EMIS - Toilet stances
- **Data Element ID**: `n0wlUuIV7ff`
- **Category Combo**: Toilet stances sex (`vrOtGTgqBLP`)
- **Categories**:
  - Male: `vpmsp7XY31l`
  - Female: `ynJYpoaorSz`
  - Special needs: `FukNGB6Q9J0`

#### EMIS - Handwashing facilities
- **Data Element ID**: `v02n6FHpyKe`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

#### EMIS - Drinking water
- **Data Element ID**: `b0YUzqNJf5v`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

#### EMIS - Electricity
- **Data Element ID**: `jsIM64TwSUm`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

#### EMIS - Internet
- **Data Element ID**: `uIOr3Fw1ikM`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

#### EMIS - Computers
- **Data Element ID**: `Cm2qphUpUuS`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

#### EMIS - Infrastructure for special needs
- **Data Element ID**: `oSfcBfzVxfc`
- **Category Combo**: default
- **Category Option**: `xYerKDKCefk`

**Total**: 10 data points

---

## Common Category Options

### Sex Category
- **Category ID**: `wQbVWQ4pMPq`
- Male: `vpmsp7XY31l`
- Female: `ynJYpoaorSz`

### Default Category
- **Category ID**: default
- Default: `xYerKDKCefk`

### PRI Grade Category
- **Category ID**: `MpgPhUAKLFO`
- Level 1-7 (see specific IDs above)

---

## Summary

| Category | Data Points | Complexity |
|----------|-------------|------------|
| Resources | 28 | Medium (4 subjects × 7 grades) |
| Staff | 8 | Low (mostly M/F splits) |
| Students | 239 | High (grade × age × sex + SNE) |
| Facilities | 10 | Low (mostly simple counts) |
| **TOTAL** | **285** | |

---

## Notes

1. **Default category option** (`xYerKDKCefk`) is used for simple count fields
2. **Sex category** uses the same IDs across all data elements (Male: `vpmsp7XY31l`, Female: `ynJYpoaorSz`)
3. **Grade levels** are consistent across learners and books
4. **Subject names** are generic (Subject 1-4) and may need to be mapped to actual subjects
5. This reference is for **Primary Schools** only. Lower Secondary, Upper Secondary, and ECD have different data element IDs but similar structures.
