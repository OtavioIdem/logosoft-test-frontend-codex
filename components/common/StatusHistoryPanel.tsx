'use client';
import { Timeline } from 'primereact/timeline';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { StatusHistoryItem } from '@/types/erp';
export const StatusHistoryPanel = ({ history }: { history?: StatusHistoryItem[] }) => history?.length ? <Panel header="Histórico de status" toggleable collapsed><Timeline value={history} opposite={(item) => <small>{new Date(item.criadoEm).toLocaleString('pt-BR')}</small>} content={(item) => <div className="line-height-3"><Tag value={item.statusNovo} severity="info" /><div className="text-sm text-600 mt-1">Usuário: {item.usuario ?? '-'}</div>{item.motivo ? <div className="text-sm">Motivo: {item.motivo}</div> : null}</div>} /></Panel> : null;
