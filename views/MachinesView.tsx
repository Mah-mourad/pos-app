
import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { Plus, Printer, Save, Trash2, Edit3, X, Calendar, Hash, ArrowUpRight, Filter, AlertCircle, History, AlertTriangle } from 'lucide-react';
import { Machine } from '../types';

type StatsType = {
  daily: number;
  weekly: number;
  monthly: number;
  totalAllTime: number;
  periodTotal: number;
};

const MachinesView: React.FC = () => {
  const { machines, machineReadings, addMachine, updateMachine, deleteMachine, addMachineReading, deleteMachineReading, t, hasPermission } = usePOS();
  
  // UI State
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [isMachineFormOpen, setIsMachineFormOpen] = useState(false);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  
  // Machine Form State
  const [machineForm, setMachineForm] = useState({ name: '', initialReading: '' });

  // Reading Form State
  const [isReadingFormOpen, setIsReadingFormOpen] = useState(false);
  const [readingForm, setReadingForm] = useState({ date: new Date().toISOString().split('T')[0], value: '', notes: '' });

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'period'>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Delete Modal State
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null);

  // --- Logic Helpers ---

  const selectedMachine = useMemo(() => machines.find(m => m.id === selectedMachineId), [machines, selectedMachineId]);

  const machineReadingsList = useMemo(() => {
    if (!selectedMachine) return [];
    // Sort readings by date ascending to calculate diffs correctly
    return machineReadings
        .filter(r => r.machineId === selectedMachine.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [machineReadings, selectedMachine]);

  // Calculate Readings with Differences
  const enrichedReadings = useMemo(() => {
      if (!selectedMachine) return [];
      
      return machineReadingsList.map((reading, index) => {
          // Difference is calculated based on:
          // If first reading ever: Reading Value - Initial Machine Reading
          // Else: Reading Value - Previous Reading Value
          const previousValue = index === 0 ? selectedMachine.initialReading : machineReadingsList[index - 1].value;
          const diff = reading.value - previousValue;
          return { ...reading, diff: diff > 0 ? diff : 0 };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Reverse for display (Newest first)
  }, [machineReadingsList, selectedMachine]);

  const filteredReadings = useMemo(() => {
      if (filterType === 'all') return enrichedReadings;
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return enrichedReadings.filter(r => {
          const d = new Date(r.date);
          return d >= start && d <= end;
      });
  }, [enrichedReadings, filterType, startDate, endDate]);

  const stats: StatsType = useMemo(() => {
      if (!selectedMachine) return { daily: 0, weekly: 0, monthly: 0, totalAllTime: 0, periodTotal: 0 };
      
      const now = new Date();
      const todayStart = new Date(now.setHours(0,0,0,0));
      
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let daily = 0;
      let weekly = 0;
      let monthly = 0;
      let totalAllTime = 0;
      let periodTotal = 0;

      // Filter period constraints
      const pStart = new Date(startDate); pStart.setHours(0,0,0,0);
      const pEnd = new Date(endDate); pEnd.setHours(23,59,59,999);

      // Iterate through enriched readings (which have diff calculated)
      // Note: enrichedReadings are sorted DESC (newest first)
      enrichedReadings.forEach(r => {
          const rDate = new Date(r.date);
          
          // Total All Time
          totalAllTime += r.diff;

          // Daily
          if (rDate >= todayStart) daily += r.diff;

          // Weekly
          if (rDate >= weekStart) weekly += r.diff;

          // Monthly
          if (rDate >= monthStart) monthly += r.diff;

          // Period
          if (filterType === 'period' && rDate >= pStart && rDate <= pEnd) {
              periodTotal += r.diff;
          }
      });

      return { daily, weekly, monthly, totalAllTime, periodTotal };
  }, [enrichedReadings, filterType, startDate, endDate]);


  // --- Handlers ---

  const handleMachineSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!machineForm.name) return;
      
      if (editingMachineId) {
          updateMachine(editingMachineId, { 
              name: machineForm.name, 
              initialReading: parseFloat(machineForm.initialReading) || 0 
          });
      } else {
          addMachine({ 
              name: machineForm.name, 
              initialReading: parseFloat(machineForm.initialReading) || 0 
          });
      }
      resetMachineForm();
  };

  const handleReadingSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMachineId || !readingForm.value) return;

      addMachineReading({
          machineId: selectedMachineId,
          date: readingForm.date,
          value: parseFloat(readingForm.value),
          notes: readingForm.notes
      });
      
      setReadingForm({ date: new Date().toISOString().split('T')[0], value: '', notes: '' });
      setIsReadingFormOpen(false);
  };

  const handleDeleteMachine = (id: string) => {
      setMachineToDelete(id);
  };

  const confirmDeleteMachine = () => {
      if (machineToDelete) {
          deleteMachine(machineToDelete);
          if (selectedMachineId === machineToDelete) setSelectedMachineId(null);
          setMachineToDelete(null);
      }
  };

  const resetMachineForm = () => {
      setIsMachineFormOpen(false);
      setEditingMachineId(null);
      setMachineForm({ name: '', initialReading: '' });
  };

  const openEditMachine = (m: Machine) => {
      setMachineForm({ name: m.name, initialReading: m.initialReading.toString() });
      setEditingMachineId(m.id);
      setIsMachineFormOpen(true);
  };

  const currentReadingValue = machineReadingsList.length > 0 
      ? machineReadingsList[machineReadingsList.length - 1].value 
      : (selectedMachine?.initialReading || 0);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Sidebar: List of Machines */}
      <div className={`w-full md:w-80 bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col z-10 ${selectedMachine ? 'hidden md:flex h-full' : 'h-full'}`}>
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg text-gray-800 dark:text-white">{t('machinesTitle')}</h2>
                  {hasPermission('machines.manage') && (
                      <button onClick={() => { resetMachineForm(); setIsMachineFormOpen(true); }} className="bg-primary text-white p-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
                          <Plus size={18} />
                      </button>
                  )}
              </div>
              <p className="text-xs text-gray-400">{t('machinesSubtitle')}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {machines.map(machine => (
                  <div 
                      key={machine.id}
                      onClick={() => setSelectedMachineId(machine.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${selectedMachineId === machine.id ? 'bg-primary text-white border-primary shadow-lg shadow-red-100' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-gray-600'}`}
                  >
                      <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${selectedMachineId === machine.id ? 'bg-white/20' : 'bg-white dark:bg-gray-800'}`}>
                                  <Printer size={20} className={selectedMachineId === machine.id ? 'text-white' : 'text-gray-500'} />
                              </div>
                              <div>
                                  <h3 className={`font-bold ${selectedMachineId === machine.id ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{machine.name}</h3>
                                  <div className={`text-xs mt-1 ${selectedMachineId === machine.id ? 'text-white/80' : 'text-gray-400'}`}>
                                      {t('initialReading')}: {machine.initialReading}
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Actions */}
                      {hasPermission('machines.manage') && (
                          <div className={`absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                               <button 
                                  onClick={(e) => { e.stopPropagation(); openEditMachine(machine); }} 
                                  className={`p-1.5 rounded-md ${selectedMachineId === machine.id ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-200 text-gray-600 hover:bg-blue-100 hover:text-blue-600'}`}
                               >
                                  <Edit3 size={14} />
                               </button>
                               <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMachine(machine.id); }} 
                                  className={`p-1.5 rounded-md ${selectedMachineId === machine.id ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600'}`}
                               >
                                  <Trash2 size={14} />
                               </button>
                          </div>
                      )}
                  </div>
              ))}
              {machines.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                      <Printer size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{t('noMachines')}</p>
                  </div>
              )}
          </div>
      </div>

      {/* Main Content: Details */}
      <div className={`flex-1 bg-gray-50 dark:bg-gray-900 h-full flex-col overflow-hidden relative ${selectedMachine ? 'flex' : 'hidden md:flex'}`}>
          {selectedMachine ? (
              <div className="h-full flex flex-col overflow-y-auto p-4 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-2">
                      <div>
                          <button onClick={() => setSelectedMachineId(null)} className="md:hidden mb-2 text-sm text-gray-500 flex items-center gap-1">← رجوع للقائمة</button>
                          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white flex flex-wrap items-center gap-2">
                              {selectedMachine.name}
                              <span className="text-sm font-normal text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                  <History size={14} />
                                  {t('currentReading')}: <span className="font-bold text-primary">{currentReadingValue}</span>
                              </span>
                          </h1>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('allTimeTotal')}</button>
                                <button onClick={() => setFilterType('period')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'period' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t('periodTotal')}</button>
                            </div>
                            {filterType === 'period' && (
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 px-3 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto">
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                                    <span className="text-gray-400">-</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs outline-none font-medium text-gray-600 dark:text-gray-300 flex-1" />
                                </div>
                            )}
                      </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                          <div className="text-gray-400 text-xs font-bold mb-1">{t('dailyTotal')}</div>
                          <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{stats.daily} <span className="text-xs font-normal text-gray-400">{t('shots')}</span></div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                          <div className="text-gray-400 text-xs font-bold mb-1">{t('weeklyTotal')}</div>
                          <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{stats.weekly} <span className="text-xs font-normal text-gray-400">{t('shots')}</span></div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                          <div className="text-gray-400 text-xs font-bold mb-1">{t('monthlyTotal')}</div>
                          <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{stats.monthly} <span className="text-xs font-normal text-gray-400">{t('shots')}</span></div>
                      </div>
                      <div className={`p-3 md:p-4 rounded-xl shadow-sm border ${filterType === 'period' ? 'bg-primary text-white border-primary' : 'bg-gray-800 text-white border-gray-800'}`}>
                          <div className="text-white/60 text-xs font-bold mb-1">{filterType === 'period' ? t('periodTotal') : t('allTimeTotal')}</div>
                          <div className="text-xl md:text-2xl font-bold">{filterType === 'period' ? stats.periodTotal : stats.totalAllTime} <span className="text-xs font-normal text-white/60">{t('shots')}</span></div>
                      </div>
                  </div>

                  {/* Add Reading Button & Form */}
                  <div className="mb-6">
                      {!isReadingFormOpen ? (
                          hasPermission('machines.manage') && (
                              <button 
                                onClick={() => setIsReadingFormOpen(true)}
                                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all font-bold flex items-center justify-center gap-2"
                              >
                                  <Plus size={20} />
                                  {t('addReading')}
                              </button>
                          )
                      ) : (
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t('addReading')}</h3>
                                  <button onClick={() => setIsReadingFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                              </div>
                              <form onSubmit={handleReadingSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="md:col-span-1">
                                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('readingDate')}</label>
                                      <div className="relative">
                                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                          <input 
                                              type="date"
                                              required
                                              value={readingForm.date}
                                              onChange={e => setReadingForm({...readingForm, date: e.target.value})}
                                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white pr-10"
                                          />
                                      </div>
                                  </div>
                                  <div className="md:col-span-1">
                                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('readingValue')}</label>
                                      <div className="relative">
                                          <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                          <input 
                                              type="number"
                                              required
                                              placeholder={currentReadingValue.toString()}
                                              value={readingForm.value}
                                              onChange={e => setReadingForm({...readingForm, value: e.target.value})}
                                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white pr-10"
                                          />
                                      </div>
                                  </div>
                                  <div className="md:col-span-1">
                                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('readingNotes')}</label>
                                      <input 
                                          type="text"
                                          placeholder="..."
                                          value={readingForm.notes}
                                          onChange={e => setReadingForm({...readingForm, notes: e.target.value})}
                                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                                      />
                                  </div>
                                  <div className="md:col-span-1 flex flex-col justify-end">
                                      <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2">
                                          <Save size={18} /> {t('add')}
                                      </button>
                                  </div>
                              </form>
                          </div>
                      )}
                  </div>

                  {/* Readings Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-col">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                           <h3 className="font-bold text-gray-800 dark:text-white">{t('machineDetails')}</h3>
                           <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{filteredReadings.length} reading(s)</span>
                      </div>
                      {/* REMOVED flex-1, max-h, and overflow-hidden to allow full height table expansion */}
                      <div className="overflow-visible w-full">
                          <div className="overflow-x-auto">
                              <table className="w-full text-right whitespace-nowrap min-w-[600px]">
                                  <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-sm font-medium">
                                      <tr>
                                          <th className="px-6 py-3">{t('readingDate')}</th>
                                          <th className="px-6 py-3">{t('readingValue')}</th>
                                          <th className="px-6 py-3">{t('readingDiff')}</th>
                                          <th className="px-6 py-3">{t('readingNotes')}</th>
                                          <th className="px-6 py-3 w-20"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {filteredReadings.map((reading) => (
                                          <tr key={reading.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                              <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                                                  {new Date(reading.date).toLocaleDateString('ar-EG')}
                                              </td>
                                              <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{reading.value}</td>
                                              <td className="px-6 py-4">
                                                  <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                      <ArrowUpRight size={12} /> {reading.diff}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-sm text-gray-500">{reading.notes || '-'}</td>
                                              <td className="px-6 py-4">
                                                  {hasPermission('machines.manage') && (
                                                      <button onClick={() => deleteMachineReading(reading.id)} className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors"><Trash2 size={16}/></button>
                                                  )}
                                              </td>
                                          </tr>
                                      ))}
                                      {filteredReadings.length === 0 && (
                                          <tr><td colSpan={5} className="text-center py-8 text-gray-400">{t('noMachines')}</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

              </div>
          ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <Printer size={40} className="opacity-40" />
                  </div>
                  <p className="font-medium">{t('selectMachine')}</p>
              </div>
          )}
      </div>

      {/* Add/Edit Machine Modal */}
      {isMachineFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-6 scale-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">{editingMachineId ? 'تعديل بيانات الماكينة' : t('newMachine')}</h3>
              <button onClick={resetMachineForm} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleMachineSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('machineName')}</label>
                  <input 
                      required
                      value={machineForm.name}
                      onChange={e => setMachineForm({...machineForm, name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                      placeholder="Konica Minolta..."
                  />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('initialReading')}</label>
                  <input 
                      type="number"
                      value={machineForm.initialReading}
                      onChange={e => setMachineForm({...machineForm, initialReading: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 outline-none focus:border-primary dark:text-white"
                      placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">القراءة التي بدأت عندها الماكينة العمل في هذا النظام</p>
               </div>

               <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary-hover shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 mt-4">
                  <Save size={18} /> {t('save')}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {machineToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">تأكيد الحذف</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">هل أنت متأكد من حذف هذه الماكينة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                      
                      <div className="flex gap-3 w-full">
                          <button 
                            type="button"
                            onClick={() => setMachineToDelete(null)}
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors"
                          >
                              إلغاء
                          </button>
                          <button 
                            type="button"
                            onClick={confirmDeleteMachine}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                          >
                              حذف
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default MachinesView;
