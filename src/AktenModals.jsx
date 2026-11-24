// src/AktenModals.jsx
// AUSGELAGERTE OVERLAY-MODALS & RESPONSIVE STYLES FÜR DAS AKTEN-COCKPIT
// Enthält: 1. Responsive Tabellen-/Grid-CSS, 2. Posteingangs-Triage-Modal, 3. Datei-Vergessen-Warnung, 4. Globale Versandhistorie

import React from 'react';
import Icon from './Icon';
import { extractFilename } from './utils';
import { formatDatum, druckeSendebericht } from './utils/aktenHelpers';

export default function AktenModals({
  theme,
  isDarkMode,
  btnTextColor,
  inputStyle,
  quickBtnStyle,
  showTriageModal,
  setShowTriageModal,
  triageWvDate,
  setTriageWvDate,
  aktion,
  speichereEintragLogik,
  showUploadReminder,
  setShowUploadReminder,
  proceedToSaveOrTriage,
  showVersandHistorie,
  setShowVersandHistorie,
  modus,
  selectedAkteId,
  activeAkteObj,
  anzeigeAusgaenge,
  expandedVersandId,
  setExpandedVersandId,
  springeZuAkteAusgang
}) {
  return (
    <>
      <style>{`
        /* HELPER KLASSEN FÜR STRIKTE TRENNUNG */
        .desktop-only {
          display: initial;
        }
        .mobile-only {
          display: none !important;
        }

        .hist-typ-select {
          background: transparent;
          color: ${theme.accent};
          border: 1px dashed transparent;
          border-bottom: 1px dashed ${theme.border};
          width: 100%;
          font-size: 13px;
          padding: 4px;
          font-weight: bold;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
          transition: all 0.2s ease;
          border-radius: 4px;
        }
        .hist-typ-select:hover, .hist-typ-select:focus {
          background: ${theme.accent} !important;
          color: ${btnTextColor} !important;
          border: 1px solid ${theme.accent} !important;
        }
        .hist-typ-select option {
          background: ${theme.cardBg};
          color: ${theme.textMain};
        }

        .vh-desktop-header {
          display: grid;
          grid-template-columns: 80px 2.5fr 2.5fr 190px 190px 30px;
          gap: 15px;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          align-items: center;
        }
        .vh-row-grid {
          display: grid;
          grid-template-columns: 80px 2.5fr 2.5fr 190px 190px 30px;
          gap: 15px;
          padding: 15px 20px;
          align-items: start;
          cursor: pointer;
        }
        .vh-expanded-grid {
          display: grid;
          grid-template-columns: 80px 2.5fr 2.5fr 190px 190px 30px;
          gap: 15px;
          align-items: center;
        }

        .akten-desktop-header {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
        }
        .akten-desktop-grid {
          display: grid;
          grid-template-columns: 1.2fr 2fr 2fr 1.5fr 1.5fr;
          gap: 15px;
          align-items: center;
        }
        .akten-row-wrapper {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          cursor: pointer;
          flex-wrap: nowrap;
          gap: 10px;
        }
        .akten-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hist-desktop-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          font-size: 13px;
        }
        .hist-desktop-table thead {
          display: table-header-group;
        }
        .hist-desktop-table tbody tr {
          display: table-row;
        }
        .hist-desktop-table tbody td {
          display: table-cell;
        }

        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }

          .vh-desktop-header {
            display: none !important;
          }
          .vh-row-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 15px !important;
          }
          .vh-col-full {
            width: 100% !important;
          }
          .vh-expanded-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .vh-expanded-grid > div {
            width: 100% !important;
          }

          .akten-desktop-header {
            display: none !important;
          }
          .akten-row-wrapper {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 15px !important;
            gap: 10px !important;
          }
          .akten-mobile-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .akten-desktop-grid {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .akten-field-box {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            width: 100% !important;
          }
          .akten-actions-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .akten-actions-bar button {
            width: 100% !important;
            justify-content: center !important;
            min-height: 40px !important;
          }

          .hist-desktop-table {
            min-width: 100% !important;
            display: block !important;
          }
          .hist-desktop-table thead {
            display: none !important;
          }
          .hist-desktop-table tbody {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .hist-desktop-table tbody tr {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 14px !important;
            border: 1px solid ${theme.border} !important;
            border-radius: 8px !important;
            background: ${theme.cardBg} !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }
          .hist-desktop-table tbody td {
            display: block !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .hist-desktop-table tbody td.desktop-only {
            display: none !important;
          }
          .akten-field-box.desktop-only {
            display: none !important;
          }
          .hist-mobile-header-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 10px !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* 1. POSTEINGANGS-TRIAGE-MODAL */}
      {showTriageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="folder" size={24} /> Posteingang abheften
            </h3>
            <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>
              Wie möchtest du mit diesem Eingangsdokument weiter verfahren?
            </p>

            <button
              onClick={() => {
                setShowTriageModal(false);
                speichereEintragLogik();
              }}
              style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>1. Sofort antworten (War-Room)</span> <Icon name="right" size={16} />
            </button>

            <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ color: theme.textMain, fontSize: '14px' }}>2. Später antworten (Wiedervorlage)</strong>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={triageWvDate}
                  onChange={(e) => setTriageWvDate(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 auto', padding: '8px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setTriageWvDate(d.toISOString().split('T')[0]);
                  }}
                  style={quickBtnStyle}
                >
                  +3T
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setTriageWvDate(d.toISOString().split('T')[0]);
                  }}
                  style={quickBtnStyle}
                >
                  +1W
                </button>
              </div>
              <button
                onClick={() => {
                  setShowTriageModal(false);
                  speichereEintragLogik({
                    overrideAktion: 'Wiedervorlage zur Beantwortung',
                    overrideWv: triageWvDate,
                    preventWarRoom: true
                  });
                }}
                style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Speichern &amp; Wiedervorlage setzen
              </button>
            </div>

            <button
              onClick={() => {
                setShowTriageModal(false);
                speichereEintragLogik({
                  overrideAktion: aktion || 'Kenntnisnahme / Abgelegt',
                  preventWarRoom: true
                });
              }}
              style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              3. Nur ablegen (Info/Kenntnisnahme)
            </button>

            <button
              onClick={() => setShowTriageModal(false)}
              style={{ background: 'transparent', color: theme.textMuted, border: 'none', padding: '10px', cursor: 'pointer', fontSize: '13px', marginTop: '10px' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* 2. UPLOAD-ERINNERUNGS-MODAL */}
      {showUploadReminder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.warningBorder}`, borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <Icon name="alert" size={48} style={{ color: theme.warningBorder, marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 15px 0', color: theme.textMain, fontSize: '20px' }}>Dateien vergessen?</h3>
            <p style={{ color: theme.textMuted, fontSize: '15px', marginBottom: '25px', lineHeight: '1.5' }}>
              Du hast aktuell <strong>keine</strong> Dokumente (PDF/MD) für den Upload in diese Akte ausgewählt.<br /><br />
              Möchtest du die Akte / den Eintrag wirklich <strong>ohne Dateien</strong> anlegen?
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowUploadReminder(false)}
                style={{ padding: '12px 18px', background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}
              >
                Abbrechen &amp; Dateien auswählen
              </button>
              <button
                onClick={proceedToSaveOrTriage}
                style={{ padding: '12px 18px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}
              >
                Trotzdem ohne Dateien speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. VERSANDHISTORIE-MODAL */}
      {showVersandHistorie && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', maxWidth: '1200px', width: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.inputBg }}>
              <h3 style={{ margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px' }}>
                <Icon name="send" size={18} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {modus === 'bestehend' && selectedAkteId
                    ? `Versandhistorie [${activeAkteObj?.unser_zeichen || 'Unbekannt'}]`
                    : 'Globale Versandhistorie'}{' '}
                  ({anzeigeAusgaenge.length})
                </span>
              </h3>
              <button
                onClick={() => setShowVersandHistorie(false)}
                style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '15px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', width: '100%' }}>
                <div className="vh-desktop-header" style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textMuted }}>
                  <div>Datum</div>
                  <div>Vorgang &amp; Akte</div>
                  <div>Gegner &amp; Kontakt</div>
                  <div style={{ textAlign: 'center' }}>Versandart</div>
                  <div>Anhänge</div>
                  <div></div>
                </div>

                {anzeigeAusgaenge.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted, background: theme.inputBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    Bislang wurden noch keine Schreiben für diese Auswahl versendet.
                  </div>
                ) : (
                  anzeigeAusgaenge.map((ausgang) => {
                    const isExpanded = expandedVersandId === ausgang.id;
                    const rawAction = ausgang.aktion || '';
                    const zielKontakt = rawAction.includes('versendet an ')
                      ? rawAction.split('versendet an ')[1]
                      : '';
                    const sichtbareAusgangUrls = ausgang.dokument_url
                      ? ausgang.dokument_url
                          .split(',')
                          .map((u) => u.trim())
                          .filter((u) => u !== '' && !u.toLowerCase().split('?')[0].endsWith('.md'))
                      : [];

                    return (
                      <div
                        key={ausgang.id}
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: isExpanded
                            ? isDarkMode
                              ? 'rgba(0, 229, 255, 0.05)'
                              : '#f0f9ff'
                            : theme.inputBg
                        }}
                      >
                        <div
                          className="vh-row-grid"
                          onClick={() => setExpandedVersandId(isExpanded ? null : ausgang.id)}
                        >
                          <div className="mobile-only" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>
                              {formatDatum(ausgang.datum)}
                            </span>
                            <strong
                              onClick={(e) => {
                                e.stopPropagation();
                                springeZuAkteAusgang(ausgang.akte_id, ausgang.id);
                              }}
                              style={{ color: theme.accent, fontSize: '13px', cursor: 'pointer' }}
                              title="Klicken, um diesen Vorgang direkt in der Akte anzuzeigen"
                            >
                              [{ausgang.unser_zeichen || '---'}]
                            </strong>
                            <span style={{ color: theme.textMuted }}>
                              <Icon name={isExpanded ? 'down' : 'right'} size={18} />
                            </span>
                          </div>

                          <div className="desktop-only" style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain, paddingTop: '6px' }}>
                            {formatDatum(ausgang.datum)}
                          </div>

                          <div className="vh-col-full" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <strong
                              className="desktop-only"
                              onClick={(e) => {
                                e.stopPropagation();
                                springeZuAkteAusgang(ausgang.akte_id, ausgang.id);
                              }}
                              style={{ color: theme.accent, fontSize: '13px', cursor: 'pointer', width: 'fit-content' }}
                              title="Klicken, um diesen Vorgang direkt in der Akte anzuzeigen"
                            >
                              [{ausgang.unser_zeichen || '---'}]
                            </strong>
                            {ausgang.aktenzeichen && (
                              <span style={{ fontSize: '12px', color: theme.textMain, fontWeight: 'bold' }}>
                                {ausgang.aktenzeichen}
                              </span>
                            )}
                            <span style={{ fontSize: '13px', color: theme.textMain }}>
                              {ausgang.thema || '-'}
                            </span>
                          </div>

                          <div className="vh-col-full" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <strong style={{ color: theme.textMain, fontSize: '13px' }}>{ausgang.gegner_name || '-'}</strong>
                            <span style={{ fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="user" size={10} /> {ausgang.gegner_ansprechpartner || 'Zentrale / Allgemein'}
                            </span>
                            {zielKontakt && (
                              <span style={{ fontSize: '11px', color: theme.accent, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Icon name={zielKontakt.includes('@') ? 'mail' : 'phone'} size={10} /> {zielKontakt}
                              </span>
                            )}
                          </div>

                          <div className="vh-col-full">
                            <div
                              style={{
                                background: 'transparent',
                                border: `1px solid ${theme.accent}`,
                                color: theme.accent,
                                padding: '6px 8px',
                                minHeight: '34px',
                                boxSizing: 'border-box',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                width: '100%',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={ausgang.kanal || 'Ausgang'}
                            >
                              <Icon name={ausgang.kanal?.toLowerCase().includes('mail') ? 'mail' : 'phone'} size={12} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ausgang.kanal || 'Ausgang'}</span>
                            </div>
                          </div>

                          <div className="vh-col-full" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {sichtbareAusgangUrls.length > 0 ? (
                              sichtbareAusgangUrls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 8px',
                                    minHeight: '34px',
                                    boxSizing: 'border-box',
                                    fontSize: '11px',
                                    color: theme.accent,
                                    background: 'transparent',
                                    border: `1px solid ${theme.accent}`,
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    width: '100%',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={extractFilename(url)}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Icon name="file" size={12} style={{ flexShrink: 0 }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{extractFilename(url)}</span>
                                </a>
                              ))
                            ) : (
                              <span style={{ fontSize: '12px', color: theme.textMuted }}>Keine Anhänge</span>
                            )}
                          </div>

                          <div className="desktop-only" style={{ color: theme.textMuted, textAlign: 'right', paddingTop: '6px' }}>
                            <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '0 20px 15px 20px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                            <div className="vh-expanded-grid" style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: '12px' }}>
                              <div style={{ gridColumn: '1 / 4', fontSize: '12px', color: theme.textMuted }}>
                                Klicke auf Sendebericht, um einen Druckbeleg zu erzeugen, oder springe direkt zum Vorgang in der Akte.
                              </div>
                              <div>
                                <button
                                  onClick={() => druckeSendebericht(ausgang)}
                                  style={{
                                    background: theme.accent,
                                    color: btnTextColor,
                                    border: 'none',
                                    padding: '8px 10px',
                                    minHeight: '38px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <Icon name="print" size={13} /> Sendebericht drucken
                                </button>
                              </div>
                              <div>
                                <button
                                  onClick={() => springeZuAkteAusgang(ausgang.akte_id, ausgang.id)}
                                  style={{
                                    background: theme.accent,
                                    color: btnTextColor,
                                    border: 'none',
                                    padding: '8px 10px',
                                    minHeight: '38px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <Icon name="folder" size={13} /> Vorgang in Akte öffnen
                                </button>
                              </div>
                              <div className="desktop-only"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, background: theme.inputBg, textAlign: 'right' }}>
              <button
                onClick={() => setShowVersandHistorie(false)}
                style={{ padding: '8px 16px', background: theme.border, color: theme.textMain, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}