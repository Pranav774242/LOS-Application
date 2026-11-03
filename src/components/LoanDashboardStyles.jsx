'use client';

export default function LoanDashboardStyles() {
  return (
    <style jsx global>{`
          .loan-dashboard {
            min-width: 0;
          }

          :global(.apply-button) {
            flex-shrink: 0;
            color: #ffffff !important;
            background: #198754 !important;
            border-color: #198754 !important;
          }

          :global(.apply-button:hover) {
            color: #ffffff !important;
            background: #146c43 !important;
            border-color: #13653f !important;
          }

          :global(.apply-button:focus-visible) {
            outline: 3px solid #19875455;
            outline-offset: 3px;
          }

          .loan-metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 15px;
            margin-bottom: 19px;
          }

          .loan-metrics :global(.loan-metric-card) {
            min-height: 126px;
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 20px;
          }

          .loan-metric-icon {
            width: 42px;
            height: 42px;
            display: grid;
            flex: 0 0 auto;
            place-items: center;
            border-radius: 9px;
          }

          .loan-metric-icon.teal {
            color: #177e7a;
            background: #e5f2f0;
          }

          .loan-metric-icon.green {
            color: #398365;
            background: #e7f3eb;
          }

          .loan-metric-icon.blue {
            color: #4e7da2;
            background: #e8f0f7;
          }

          .loan-metrics :global(.loan-metric-card p) {
            margin: 0 0 6px;
            color: #718185;
            font-size: 12px;
          }

          .loan-metrics :global(.loan-metric-card strong) {
            color: #1e3f45;
            font: 700 27px Manrope, sans-serif;
            line-height: 1.1;
          }

          :global(.loan-table-card) {
            min-width: 0;
          }

          .loan-table-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 19px;
          }

          .loan-table-heading h2 {
            margin: 0;
            color: #23474c;
            font: 700 16px Manrope, sans-serif;
          }

          .loan-table-heading p {
            margin: 6px 0 0;
            color: #91a0a3;
            font-size: 11px;
          }

          .sample-data-label {
            flex-shrink: 0;
            padding: 6px 9px;
            border: 1px solid #e5ecec;
            border-radius: 20px;
            color: #718185;
            background: #f8fbfa;
            font-size: 10px;
            font-weight: 600;
          }

          .loan-search {
            min-height: 40px;
            display: flex;
            align-items: center;
            gap: 9px;
            margin-bottom: 17px;
            padding: 0 12px;
            border: 1px solid #dfe8e8;
            border-radius: 6px;
            color: #849497;
            background: #fff;
          }

          .loan-search-row {
            display: flex;
            align-items: stretch;
            gap: 10px;
            margin-bottom: 17px;
          }

          .loan-search-row .loan-search {
            flex: 1;
            min-width: 0;
            margin-bottom: 0;
          }

          .loan-search-button {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 40px;
          }

          .loan-search:focus-within {
            border-color: #70aaa4;
            box-shadow: 0 0 0 3px #177e7a18;
          }

          .loan-search input {
            width: 100%;
            min-width: 0;
            height: 38px;
            padding: 0;
            border: 0;
            outline: 0;
            color: #33474c;
            background: transparent;
            font-size: 12px;
          }

          .loan-search input::placeholder {
            color: #9aa8aa;
          }

          .loan-table-scroll {
            overflow-x: auto;
            border: 1px solid #edf2f1;
            border-radius: 6px;
          }

          .loan-applications-table {
            width: 100%;
            min-width: 980px;
            border-collapse: collapse;
            text-align: left;
            color: #617377;
            font-size: 11px;
          }

          .loan-applications-table th {
            padding: 12px;
            border-top: 0;
            white-space: nowrap;
          }

          .loan-applications-table td {
            padding: 13px 12px;
            white-space: nowrap;
          }

          .application-id {
            color: #267a7a;
          }

          .loan-amount {
            color: #435f63;
            font-weight: 700;
          }

          .loan-status {
            display: inline-flex;
            align-items: center;
            padding: 5px 8px;
            border-radius: 20px;
            color: #617377;
            background: #eef2f2;
            font-size: 10px;
            font-weight: 700;
          }

          .loan-status.approved,
          .loan-status.disbursed {
            color: #31815e;
            background: #e7f3eb;
          }

          .loan-status.pending,
          .loan-status.awaiting-kyc,
          .loan-status.returned {
            color: #a16f35;
            background: #fbf1e2;
          }

          .loan-status.under-review {
            color: #4d7c9f;
            background: #eaf1f7;
          }

          .loan-status.rejected {
            color: #a95757;
            background: #faeaea;
          }

          .no-action {
            color: #a3afb0;
          }

          .application-actions {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .application-action-button {
            width: 30px;
            height: 30px;
            display: inline-grid;
            place-items: center;
            border: 1px solid #dfe8e8;
            border-radius: 6px;
            color: #267a7a;
            background: #fff;
          }

          .application-action-button:hover {
            border-color: #8bbab4;
            color: #165f5c;
            background: #edf6f4;
          }

          .application-dialog {
            width: min(100%, 560px);
          }

          .application-detail-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 0;
          }

          .application-detail-list > div {
            min-width: 0;
            padding: 11px;
            border: 1px solid #e5ecec;
            border-radius: 7px;
          }

          .application-detail-list dt {
            margin-bottom: 5px;
            color: #718185;
            font-size: 10px;
          }

          .application-detail-list dd {
            margin: 0;
            overflow-wrap: anywhere;
            color: #34565b;
            font-size: 12px;
            font-weight: 700;
          }

          .application-edit-form {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .application-dialog-actions {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 4px;
          }

          .application-actions {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .application-action-button {
            width: 30px;
            height: 30px;
            display: inline-grid;
            place-items: center;
            border: 1px solid #dfe8e8;
            border-radius: 6px;
            color: #267a7a;
            background: #fff;
          }

          .application-action-button:hover {
            border-color: #8bbab4;
            color: #165f5c;
            background: #edf6f4;
          }

          .category-overlay {
            position: fixed;
            z-index: 100;
            inset: 0;
            display: grid;
            place-items: center;
            padding: 20px;
            background: rgb(18 39 43 / 45%);
          }

          .category-dialog {
            position: relative;
            width: min(100%, 490px);
            padding: 30px;
            border: 1px solid #e5ecec;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 20px 60px rgb(23 63 73 / 20%);
          }

          .category-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 34px;
            height: 34px;
            display: grid;
            place-items: center;
            border-radius: 6px;
            color: #718185;
          }

          .category-close:hover {
            color: #173e46;
            background: #f1f6f5;
          }

          .category-dialog-icon {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            margin-bottom: 17px;
            border-radius: 9px;
            color: #177e7a;
            background: #e5f2f0;
          }

          .category-dialog h2 {
            margin: 0;
            color: #173e46;
            font: 700 20px Manrope, sans-serif;
            letter-spacing: -0.4px;
          }

          .category-dialog-description {
            margin: 8px 0 21px;
            color: #718185;
            font-size: 12px;
            line-height: 1.5;
          }

          .category-options {
            display: grid;
            gap: 10px;
          }

          .category-option {
            width: 100%;
            min-height: 76px;
            display: flex;
            align-items: center;
            gap: 13px;
            padding: 13px;
            border: 1px solid #e2eaea;
            border-radius: 8px;
            background: #fff;
            text-align: left;
            transition: border-color 0.16s ease, background-color 0.16s ease;
          }

          .category-option:hover,
          .category-option.selected {
            border-color: #8bbab4;
            background: #fbfefd;
          }

          .category-option-icon {
            width: 38px;
            height: 38px;
            display: grid;
            flex: 0 0 auto;
            place-items: center;
            border-radius: 8px;
          }

          .category-option-icon.retail {
            color: #177e7a;
            background: #e5f2f0;
          }

          .category-option-icon.corporate {
            color: #4e7da2;
            background: #e8f0f7;
          }

          .category-option-copy {
            display: grid;
            gap: 5px;
          }

          .category-option-copy strong {
            color: #34565b;
            font-size: 12px;
          }

          .category-option-copy span {
            color: #849497;
            font-size: 11px;
          }

          .category-option-arrow {
            margin-left: auto;
            color: #819396;
            font-size: 18px;
          }

          .corporate-notice {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-top: 14px;
            padding: 12px;
            border: 1px solid #f0dfc5;
            border-radius: 7px;
            color: #a16f35;
            background: #fffaf2;
          }

          .corporate-notice svg {
            flex: 0 0 auto;
            margin-top: 1px;
          }

          .corporate-notice div {
            display: grid;
            gap: 5px;
          }

          .corporate-notice strong {
            font-size: 11px;
          }

          .corporate-notice span {
            color: #8d795f;
            font-size: 10px;
            line-height: 1.5;
          }

          .category-back {
            margin-top: 19px;
            padding: 7px 0;
            color: #177e7a;
            font-size: 11px;
            font-weight: 700;
          }

          .category-back:hover {
            color: #0c5d5d;
            text-decoration: underline;
          }

          .apply-button:focus-visible,
          .category-option:focus-visible,
          .category-close:focus-visible,
          .category-back:focus-visible {
            outline: 3px solid #177e7a55;
            outline-offset: 2px;
          }

          @media (max-width: 900px) {
            .loan-metrics {
              gap: 11px;
            }

            .loan-metrics :global(.loan-metric-card) {
              padding: 16px;
            }

            .loan-metric-icon {
              width: 37px;
              height: 37px;
            }

            .loan-metrics :global(.loan-metric-card p) {
              font-size: 11px;
            }
          }

          @media (max-width: 640px) {
            .loan-metrics {
              grid-template-columns: 1fr;
            }

            .loan-metrics :global(.loan-metric-card) {
              min-height: 92px;
            }

            :global(.loan-table-card) {
              padding: 16px;
            }

            .loan-table-heading {
              flex-direction: column;
            }

            .category-dialog {
              padding: 24px 20px;
            }

            .application-edit-form,
            .application-detail-list {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
  );
}
