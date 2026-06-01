<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Chart from 'chart.js/auto';

  // ── types ───────────────────────────────────────────────────────────────────
  type FeeStats = { totalFeeAmount: number; collectedAmount: number; pendingAmount: number; totalStudents: number; paidCount: number; partialCount: number; unpaidCount: number; overdueCount: number };
  type DashboardSummary = { fee?: FeeStats; salary?: { totalStaff: number; totalSalaryAmount: number; paidSalaryAmount: number; pendingSalaryAmount: number }; investors?: { total: number; totalInvested: number; totalRepaid: number; balanceDue: number } };
  type ClassFeeStructure = { _id: string; class_id: string; academic_year: string; academic_fee: number; default_transport_fee: number; other_fee: number; due_date: string; late_fee_type: string; late_fee_amount: number; late_fee_grace_days: number; late_fee_description?: string; paidCount: number; pendingCount: number; assignedCount: number };
  type SchoolClassItem = { _id: string; name: string; section?: string };
  type FeeComponent = { label: string; amount: number };
  type StudentFeeItem = { studentId: string; financeId?: string; student: { name: string; class: string; rollNumber?: string }; status: string; totalFee: number; paidAmount: number; remainingAmount: number; currentDueAmount?: number; dueDate?: string; feeComponents: FeeComponent[]; olderPendingAmount?: number };
  type SummaryMetrics = { totalStudents: number; currentTotalFee: number; currentPaidAmount: number; currentPendingAmount: number; overdueCount: number; outstandingBalance: number };
  type StudentSummaryResponse = { items: StudentFeeItem[]; metrics?: SummaryMetrics; pagination?: { totalPages: number; totalItems: number } };
  type LateFeeType = 'none' | 'fixed' | 'daily' | 'percentage';
  type FeeForm = { classId: string; academicYear: string; academicFee: string; transportFee: string; otherFee: string; dueDate: string; lateFeeType: LateFeeType; lateFeeAmount: string; lateFeeGraceDays: string; lateFeeDescription: string };
  type ClassRow = { className: string; totalFee: number; collected: number; pending: number; totalStudents: number; collectionPct: number };
  type StaffInfo = { _id: string; name: string; position?: string; department?: string; email?: string };
  type SalarySummaryItem = { financeId?: string; staffId: StaffInfo; salary: number; paidAmount: number; status: string; paymentDate?: string; academicYear: string };
  type InvestorTx = { _id?: string; type: string; amount: number; date: string; note?: string };
  type InvestorLedger = { _id: string; investorName: string; investorType: string; contact?: string; description?: string; status: string; transactions: InvestorTx[]; totalInvested: number; totalRepaid: number; balanceToRepay: number };

  // ── auth ────────────────────────────────────────────────────────────────────
  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ── tab state ────────────────────────────────────────────────────────────────
  type FinanceAction = 'overview' | 'fee-structure' | 'record-payment' | 'salary' | 'investor-ledger' | 'expense' | 'banking' | 'school-investment' | 'asset';
  let activeAction = $state<FinanceAction>('overview');

  const PHASE1_ACTIONS = [
    { id: 'fee-structure',   label: 'Create Fee Structure',        icon: '＋' },
    { id: 'record-payment',  label: 'Record Payment Fees',          icon: '₹' },
    { id: 'salary',          label: 'Salary',                       icon: '👔' },
    { id: 'investor-ledger', label: 'Investor Ledger',              icon: '📋' },
  ] as const;

  const PHASE2_ACTIONS = [
    { id: 'expense',          label: 'Expense' },
    { id: 'banking',          label: 'Banking Details' },
    { id: 'school-investment',label: 'School Investment' },
    { id: 'asset',            label: 'Asset Module' },
  ] as const;

  // ── overview / dashboard state ───────────────────────────────────────────────
  let years = $state<string[]>([]);
  let selectedYear = $state('');
  let summary = $state<DashboardSummary | null>(null);
  let overviewLoading = $state(false);
  let overviewError = $state('');
  let allItems = $state<StudentFeeItem[]>([]);

  // ── fee structure state ──────────────────────────────────────────────────────
  const EMPTY_FORM: FeeForm = { classId: '', academicYear: '', academicFee: '', transportFee: '0', otherFee: '0', dueDate: '', lateFeeType: 'none', lateFeeAmount: '0', lateFeeGraceDays: '0', lateFeeDescription: '' };
  let structures = $state<ClassFeeStructure[]>([]);
  let schoolClasses = $state<SchoolClassItem[]>([]);
  let structuresLoading = $state(false);
  let structuresError = $state('');
  let editingId = $state<string | null>(null);
  let feeForm = $state<FeeForm>({ ...EMPTY_FORM });
  let showLateFee = $state(false);
  let savingStructure = $state(false);
  let structureSaveError = $state('');
  let structureSaveSuccess = $state('');

  // ── student fees state ───────────────────────────────────────────────────────
  let sfYear = $state('');
  let sfClass = $state('');
  let sfStatus = $state('all');
  let sfSearch = $state('');
  let sfPage = $state(1);
  let sfItems = $state<StudentFeeItem[]>([]);
  let sfMetrics = $state<SummaryMetrics | null>(null);
  let sfPagination = $state<{ totalPages: number; totalItems: number } | null>(null);
  let sfLoading = $state(false);
  let sfError = $state('');
  let sfDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let modalItem = $state<StudentFeeItem | null>(null);
  let payForm = $state({ amount: '', mode: 'cash', date: new Date().toISOString().slice(0,10), refNo: '', remarks: '' });
  let payError = $state('');
  let payLoading = $state(false);

  // ── salary state ─────────────────────────────────────────────────────────────
  let staffSummary = $state<SalarySummaryItem[]>([]);
  let staffLoading = $state(false);
  let staffError = $state('');
  let salaryModal = $state<SalarySummaryItem | null>(null);
  let salaryForm = $state({ financeId: '' as string|null, staffId: '', staffName: '', amount: '', paidAmount: '', paymentDate: new Date().toISOString().slice(0,10), academicYear: '', description: '', recordPaymentEntry: false });
  let salarySaving = $state(false);
  let salaryError = $state('');

  // ── investor state ───────────────────────────────────────────────────────────
  let investors = $state<InvestorLedger[]>([]);
  let investorsLoading = $state(false);
  let investorsError = $state('');
  let showInvestorForm = $state(false);
  let investorForm = $state({ investorName: '', investorType: 'investor', contact: '', description: '', initialInvestment: '', date: new Date().toISOString().slice(0,10), note: '' });
  let investorSaving = $state(false);
  let investorError = $state('');
  let txModal = $state<{ id: string; name: string } | null>(null);
  let txForm = $state({ type: 'investment' as 'investment'|'repayment', amount: '', date: new Date().toISOString().slice(0,10), note: '' });
  let txSaving = $state(false);
  let txError = $state('');

  // ── chart canvases ───────────────────────────────────────────────────────────
  let donutCanvas = $state<HTMLCanvasElement | undefined>();
  let barCanvas = $state<HTMLCanvasElement | undefined>();

  // ── helpers ──────────────────────────────────────────────────────────────────
  const fmt = (n: number) => `₹${Number(n||0).toLocaleString('en-IN')}`;
  const fmtS = (n: number) => { const v=Number(n||0); if(v>=10_000_000) return `₹${(v/10_000_000).toFixed(1)}Cr`; if(v>=100_000) return `₹${(v/100_000).toFixed(1)}L`; if(v>=1_000) return `₹${(v/1_000).toFixed(1)}K`; return `₹${v.toFixed(0)}`; };
  const pct = (p: number, t: number) => t>0 ? Math.min(100,Math.round((p/t)*100)) : 0;
  const statusCfg = (s: string) => { const u=(s||'').toUpperCase(); if(u==='PAID') return {label:'Paid',bg:'bg-green-100',text:'text-green-700'}; if(u==='PARTIAL') return {label:'Partial',bg:'bg-amber-100',text:'text-amber-700'}; if(u==='OVERDUE') return {label:'Overdue',bg:'bg-red-100',text:'text-red-700'}; return {label:'Pending',bg:'bg-slate-100',text:'text-slate-600'}; };
  const daysSince = (d: string) => Math.max(0, Math.floor((Date.now()-new Date(d).getTime())/86_400_000));

  // ── computed ─────────────────────────────────────────────────────────────────
  const fee = $derived(summary?.fee);
  const collPct = $derived(pct(fee?.collectedAmount??0, fee?.totalFeeAmount??0));
  const classRows = $derived.by((): ClassRow[] => {
    const map = new Map<string,ClassRow>();
    for (const item of allItems) {
      const cls = item.student?.class||'?';
      if(!map.has(cls)) map.set(cls,{className:cls,totalFee:0,collected:0,pending:0,totalStudents:0,collectionPct:0});
      const r=map.get(cls)!; r.totalFee+=item.totalFee; r.collected+=item.paidAmount; r.pending+=item.remainingAmount; r.totalStudents+=1;
    }
    return Array.from(map.values()).map(r=>({...r,collectionPct:pct(r.collected,r.totalFee)}));
  });
  const topDefaulters = $derived(allItems.filter(i=>(i.status||'').toUpperCase()!=='PAID').sort((a,b)=>b.remainingAmount-a.remainingAmount).slice(0,20));
  const filteredSfItems = $derived(sfStatus==='all' ? sfItems : sfItems.filter(i=>(i.status||'').toLowerCase()===sfStatus||(sfStatus==='pending'&&(i.status||'').toUpperCase()==='UNPAID')));
  const uniqueClasses = $derived.by(()=>{ const s=new Set<string>(); return schoolClasses.filter(c=>{ if(s.has(c.name)) return false; s.add(c.name); return true; }); });

  // ── chart effects ─────────────────────────────────────────────────────────────
  $effect(() => {
    if (!donutCanvas || activeAction!=='overview' || !fee) return;
    const c = new Chart(donutCanvas, { type:'doughnut', data:{ labels:['Paid','Partial','Unpaid','Overdue'], datasets:[{data:[fee.paidCount,fee.partialCount,fee.unpaidCount,fee.overdueCount],backgroundColor:['#10b981','#f59e0b','#94a3b8','#ef4444'],borderWidth:0}] }, options:{ cutout:'65%', plugins:{legend:{position:'bottom',labels:{font:{size:11}}}} } });
    return () => c.destroy();
  });

  $effect(() => {
    if (!barCanvas || activeAction!=='overview' || !classRows.length) return;
    const rows=[...classRows].sort((a,b)=>b.totalFee-a.totalFee).slice(0,10);
    const c = new Chart(barCanvas, { type:'bar', data:{ labels:rows.map(r=>r.className.slice(0,10)), datasets:[{label:'Billed',data:rows.map(r=>r.totalFee),backgroundColor:'#6366f1',borderRadius:4},{label:'Collected',data:rows.map(r=>r.collected),backgroundColor:'#10b981',borderRadius:4},{label:'Pending',data:rows.map(r=>r.pending),backgroundColor:'#f59e0b',borderRadius:4}] }, options:{ responsive:true, plugins:{legend:{labels:{font:{size:11}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${fmtS(ctx.raw as number)}`}}}, scales:{y:{ticks:{callback:v=>fmtS(Number(v))}}} } });
    return () => c.destroy();
  });

  // ── load functions ────────────────────────────────────────────────────────────
  async function loadYears() {
    if(!schoolId) return;
    try { const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/available-years`); const d=await r.json(); years=Array.isArray(d?.years)?d.years:[]; if(years.length&&!selectedYear){selectedYear=years[0];sfYear=years[0];} } catch{}
  }
  async function loadSummary() {
    if(!schoolId) return;
    try { overviewLoading=true; overviewError=''; const qs=selectedYear?`?academicYear=${encodeURIComponent(selectedYear)}`:''; const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/dashboard-summary${qs}`); if(!r.ok) throw new Error(`${r.status}`); summary=await r.json(); } catch(e){overviewError=e instanceof Error?e.message:'Failed';} finally{overviewLoading=false;}
  }
  async function loadAllItems() {
    if(!schoolId) return;
    try { const p=new URLSearchParams({page:'1',limit:'10000'}); if(selectedYear) p.set('academicYear',selectedYear); const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/students/summary?${p}`); if(!r.ok) return; const d=await r.json(); const data:StudentSummaryResponse=d?.data||d; allItems=Array.isArray(data?.items)?data.items:[]; } catch{}
  }
  async function loadStructures() {
    if(!schoolId) return;
    try {
      structuresLoading=true; structuresError='';
      const [sRes,cRes]=await Promise.all([fetch(`/api/finance/class-fees?schoolId=${encodeURIComponent(schoolId)}`),fetch(`/api/classes?schoolId=${encodeURIComponent(schoolId)}`)]);
      if(!sRes.ok) throw new Error(`${sRes.status}`);
      const sData=await sRes.json(); structures=Array.isArray(sData?.data)?sData.data:Array.isArray(sData)?sData:[];
      const cRaw=cRes.ok?await cRes.json():[];
      schoolClasses=Array.isArray((cRaw as {data?:unknown[]})?.data)?(cRaw as {data:typeof schoolClasses}).data:(Array.isArray(cRaw)?cRaw:[]);
    } catch(e){structuresError=e instanceof Error?e.message:'Failed';} finally{structuresLoading=false;}
  }
  async function loadStudentFees() {
    if(!schoolId) return;
    try {
      sfLoading=true; sfError='';
      const p=new URLSearchParams({page:String(sfPage),limit:'20'});
      if(sfYear) p.set('academicYear',sfYear);
      if(sfSearch) p.set('search',sfSearch);
      const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/students/summary?${p}`);
      if(!r.ok) throw new Error(`${r.status}`);
      const resp=await r.json(); const data:StudentSummaryResponse=resp?.data||resp;
      sfItems=Array.isArray(data?.items)?data.items:[]; sfMetrics=data?.metrics||null; sfPagination=data?.pagination||null;
    } catch(e){sfError=e instanceof Error?e.message:'Failed';} finally{sfLoading=false;}
  }
  async function loadStaff() {
    if(!schoolId) return;
    try { staffLoading=true; staffError=''; const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/staff/summary`); if(!r.ok) throw new Error(`${r.status}`); const d=await r.json(); staffSummary=Array.isArray(d?.data)?d.data:Array.isArray(d)?d:[]; } catch(e){staffError=e instanceof Error?e.message:'Failed';} finally{staffLoading=false;}
  }
  async function loadInvestors() {
    if(!schoolId) return;
    try { investorsLoading=true; investorsError=''; const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/investors`); if(!r.ok) throw new Error(`${r.status}`); const d=await r.json(); investors=Array.isArray(d?.data)?d.data:Array.isArray(d)?d:[]; } catch(e){investorsError=e instanceof Error?e.message:'Failed';} finally{investorsLoading=false;}
  }

  onMount(async () => {
    if(!schoolId) return;
    await loadYears();
    loadSummary(); loadAllItems(); loadStructures(); loadStudentFees(); loadStaff(); loadInvestors();
  });
  $effect(()=>{ if(schoolId&&selectedYear){loadSummary();loadAllItems();} });
  $effect(()=>{ if(schoolId&&sfYear!==undefined&&sfPage!==undefined){if(sfDebounceTimer) clearTimeout(sfDebounceTimer); sfDebounceTimer=setTimeout(()=>loadStudentFees(),300);} });

  // ── fee structure form ────────────────────────────────────────────────────────
  function startEdit(s: ClassFeeStructure) {
    editingId=s._id; feeForm={classId:s.class_id,academicYear:s.academic_year,academicFee:String(s.academic_fee),transportFee:String(s.default_transport_fee),otherFee:String(s.other_fee),dueDate:s.due_date,lateFeeType:s.late_fee_type as LateFeeType,lateFeeAmount:String(s.late_fee_amount),lateFeeGraceDays:String(s.late_fee_grace_days),lateFeeDescription:s.late_fee_description||''};
    showLateFee=s.late_fee_type!=='none'; structureSaveError=''; structureSaveSuccess='';
  }
  function cancelEdit(){editingId=null;feeForm={...EMPTY_FORM};showLateFee=false;structureSaveError='';structureSaveSuccess='';}
  async function saveStructure(e: Event) {
    e.preventDefault(); structureSaveError=''; structureSaveSuccess='';
    const acFee=Number(feeForm.academicFee)||0,trFee=Number(feeForm.transportFee)||0,otFee=Number(feeForm.otherFee)||0;
    if(!feeForm.classId||!feeForm.academicYear||!feeForm.dueDate){structureSaveError='Class, Academic Year, and Due Date are required.';return;}
    if(acFee<=0&&trFee<=0&&otFee<=0){structureSaveError='At least one fee amount must be > 0.';return;}
    try {
      savingStructure=true;
      if(editingId){
        const r=await fetch(`/api/finance/class-fees/${editingId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({academic_fee:acFee,default_transport_fee:trFee,other_fee:otFee,due_date:feeForm.dueDate})});
        if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||'Update failed.');}
        structureSaveSuccess='Updated successfully.';
      } else {
        const r=await fetch('/api/finance/class-fees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({school_id:schoolId,class_id:feeForm.classId,academic_year:feeForm.academicYear,academic_fee:acFee,default_transport_fee:trFee,other_fee:otFee,due_date:feeForm.dueDate})});
        if(!r.ok){const d=await r.json().catch(()=>null);throw new Error(d?.message||'Create failed.');}
        structureSaveSuccess='Created and auto-assigned to all active students.'; feeForm={...EMPTY_FORM}; showLateFee=false;
      }
      await loadStructures();
    } catch(e){structureSaveError=e instanceof Error?e.message:'Save failed.';} finally{savingStructure=false;}
  }

  // ── payment modal ─────────────────────────────────────────────────────────────
  function openPayModal(item: StudentFeeItem) {
    modalItem=item; payForm={amount:String(item.currentDueAmount&&item.currentDueAmount>0?item.currentDueAmount:item.remainingAmount),mode:'cash',date:new Date().toISOString().slice(0,10),refNo:'',remarks:''}; payError='';
  }
  async function recordPayment(e: Event) {
    e.preventDefault();
    if(!modalItem?.financeId){payError='No fee assignment found';return;}
    if(!payForm.amount||Number(payForm.amount)<=0){payError='Enter valid amount';return;}
    try {
      payLoading=true; payError='';
      const r=await fetch('/api/finance/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolId,studentFeeAssignmentId:modalItem.financeId,paymentDate:payForm.date,paymentAmount:Number(payForm.amount),paymentMode:payForm.mode,transactionId:payForm.refNo||undefined,remarks:payForm.remarks||undefined})});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.message||'Payment failed');
      modalItem=null;
      await Promise.all([loadStudentFees(),loadSummary(),loadAllItems()]);
    } catch(e){payError=e instanceof Error?e.message:'Payment failed';} finally{payLoading=false;}
  }

  // ── salary ────────────────────────────────────────────────────────────────────
  async function saveSalary(e: Event) {
    e.preventDefault(); salaryError='';
    try {
      salarySaving=true;
      const body={schoolId,staffId:salaryForm.staffId,amount:Number(salaryForm.amount)||0,paidAmount:Number(salaryForm.paidAmount)||0,paymentDate:salaryForm.paymentDate,academicYear:salaryForm.academicYear,description:salaryForm.description,recordPaymentEntry:salaryForm.recordPaymentEntry};
      let r:Response;
      if(salaryForm.financeId) r=await fetch(`/api/finance/salary/${salaryForm.financeId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      else r=await fetch('/api/finance/salary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(d?.message||'Save failed');
      salaryModal=null; await loadStaff();
    } catch(e){salaryError=e instanceof Error?e.message:'Failed';} finally{salarySaving=false;}
  }

  // ── investor ──────────────────────────────────────────────────────────────────
  async function createInvestor(e: Event) {
    e.preventDefault(); investorError='';
    if(!investorForm.investorName){investorError='Name required';return;}
    try {
      investorSaving=true;
      const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/investors`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({investorName:investorForm.investorName,investorType:investorForm.investorType,contact:investorForm.contact,description:investorForm.description,status:'Active',initialInvestment:Number(investorForm.initialInvestment)||0,date:investorForm.date,note:investorForm.note})});
      const d=await r.json().catch(()=>null); if(!r.ok) throw new Error(d?.message||'Failed');
      showInvestorForm=false; investorForm={investorName:'',investorType:'investor',contact:'',description:'',initialInvestment:'',date:new Date().toISOString().slice(0,10),note:''};
      await loadInvestors();
    } catch(e){investorError=e instanceof Error?e.message:'Failed';} finally{investorSaving=false;}
  }
  async function addTx(e: Event) {
    e.preventDefault(); txError='';
    if(!txForm.amount||Number(txForm.amount)<=0){txError='Enter valid amount';return;}
    try {
      txSaving=true;
      const r=await fetch(`/api/finance/${encodeURIComponent(schoolId)}/investors/${txModal!.id}/transactions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:txForm.type,amount:Number(txForm.amount),date:txForm.date,note:txForm.note})});
      const d=await r.json().catch(()=>null); if(!r.ok) throw new Error(d?.message||'Failed');
      txModal=null; await loadInvestors();
    } catch(e){txError=e instanceof Error?e.message:'Failed';} finally{txSaving=false;}
  }
  async function deleteInvestor(id: string) {
    if(!confirm('Delete this investor account?')) return;
    await fetch(`/api/finance/${encodeURIComponent(schoolId)}/investors/${id}`,{method:'DELETE'});
    await loadInvestors();
  }
</script>

<svelte:head><title>Finance — ERP Portal</title></svelte:head>

<div class="rounded-[28px] p-4 transition-all duration-300 {activeAction==='overview'?'bg-slate-50':'bg-white'}">

  <!-- ── Tab bar (exact React structure) ───────────────────────────────────── -->
  <div class="tabs-scroll overflow-x-auto pb-1">
    <div class="flex min-w-max items-center gap-1.5 rounded-xl bg-slate-100/80 p-1.5">

      <!-- Overview -->
      <button onclick={() => (activeAction='overview')}
        class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 {activeAction==='overview' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}">
        📊 Overview
      </button>

      <span class="h-4 w-px bg-slate-300/60 shrink-0"></span>

      <!-- Phase 1 actions -->
      {#each PHASE1_ACTIONS as action (action.id)}
        <button onclick={() => (activeAction = action.id)}
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 {activeAction===action.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}">
          {action.label}
        </button>
      {/each}

      <span class="h-4 w-px bg-slate-300/60 shrink-0"></span>

      <!-- Phase 2 actions (Soon) -->
      {#each PHASE2_ACTIONS as action (action.id)}
        <button onclick={() => (activeAction = action.id)}
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-150 {activeAction===action.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:bg-white/40 hover:text-slate-600'}">
          <span class="relative">
            {action.label}
            <span class="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-600">Soon</span>
          </span>
        </button>
      {/each}

    </div>
  </div>

  <!-- ── Content ────────────────────────────────────────────────────────────── -->
  <div class="mt-6 space-y-6">

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- OVERVIEW                                                               -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'overview'}
      <!-- Header -->
      <div class="stat-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Finance Command</p>
          <h2 class="mt-1 text-xl font-bold">Finance Overview</h2>
          <p class="text-sm text-muted-foreground">School-wide fee health, analytics and predictions</p>
        </div>
        <div class="flex gap-2">
          <select class="h-9 rounded-xl border border-border bg-card px-3 text-sm font-medium focus:outline-none" bind:value={selectedYear}>
            {#each years as y (y)}<option value={y}>{y}</option>{/each}
            {#if !years.length}<option value="">All Years</option>{/if}
          </select>
          <button onclick={()=>{loadSummary();loadAllItems();}} disabled={overviewLoading}
            class="h-9 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
            <span class={overviewLoading?'animate-spin':''}>↻</span> Refresh
          </button>
        </div>
      </div>

      {#if overviewError}<div class="stat-card p-4 text-red-600 text-sm">{overviewError}</div>{/if}

      <!-- KPI cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {#if overviewLoading}
          {#each Array(6) as _,i (i)}<div class="h-28 animate-pulse rounded-2xl bg-slate-100"></div>{/each}
        {:else}
          {#each [
            {label:'Total Billed', val:fmtS(fee?.totalFeeAmount??0), sub:`${fee?.totalStudents??0} students`, cls:''},
            {label:'Collected', val:fmtS(fee?.collectedAmount??0), sub:`${collPct}% of billed`, cls:'text-emerald-600'},
            {label:'Pending', val:fmtS(fee?.pendingAmount??0), sub:'outstanding', cls:'text-amber-600'},
            {label:'Collection %', val:`${collPct}%`, sub:collPct>=75?'On track':'Needs attention', cls:collPct>=75?'text-emerald-600':'text-rose-600'},
            {label:'Overdue', val:String(fee?.overdueCount??0), sub:'students', cls:'text-rose-600'},
            {label:'Staff Salary Due', val:fmtS(summary?.salary?.pendingSalaryAmount??0), sub:`${summary?.salary?.totalStaff??0} staff`, cls:'text-violet-600'},
          ] as k (k.label)}
            <div class="stat-card p-4">
              <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p class="text-xl font-extrabold mt-2 {k.cls}">{k.val}</p>
              <p class="text-xs text-muted-foreground">{k.sub}</p>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Investor summary -->
      {#if summary?.investors}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {#each [
            {label:'Total Investors', val:String(summary.investors.total), cls:'text-indigo-600'},
            {label:'Total Invested', val:fmtS(summary.investors.totalInvested), cls:'text-emerald-600'},
            {label:'Total Repaid', val:fmtS(summary.investors.totalRepaid), cls:'text-amber-600'},
            {label:'Balance Due', val:fmtS(summary.investors.balanceDue), cls:'text-rose-600'},
          ] as k (k.label)}
            <div class="stat-card p-4">
              <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <p class="text-xl font-extrabold mt-2 {k.cls}">{k.val}</p>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Collection progress + Donut -->
      {#if !overviewLoading && fee}
        <div class="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div class="stat-card p-5 space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Collection Progress</p>
              <span class="text-2xl font-extrabold {collPct>=75?'text-emerald-600':collPct>=40?'text-amber-600':'text-rose-600'}">{collPct}%</span>
            </div>
            <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div class="h-full rounded-full transition-all {collPct>=75?'bg-emerald-400':collPct>=40?'bg-amber-400':'bg-rose-400'}" style="width:{collPct}%"></div>
            </div>
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>Collected <strong class="text-foreground">{fmtS(fee.collectedAmount)}</strong></span>
              <span>Target <strong class="text-foreground">{fmtS(fee.totalFeeAmount)}</strong></span>
            </div>
            <div class="grid grid-cols-4 gap-2">
              {#each [{l:'Paid',v:fee.paidCount,c:'bg-emerald-50 text-emerald-700 border-emerald-100'},{l:'Partial',v:fee.partialCount,c:'bg-amber-50 text-amber-700 border-amber-100'},{l:'Unpaid',v:fee.unpaidCount,c:'bg-slate-50 text-slate-600 border-slate-100'},{l:'Overdue',v:fee.overdueCount,c:'bg-rose-50 text-rose-700 border-rose-100'}] as s (s.l)}
                <div class="rounded-2xl border py-3 text-center {s.c}">
                  <p class="text-xl font-extrabold">{s.v}</p>
                  <p class="text-xs font-semibold uppercase tracking-wide opacity-80">{s.l}</p>
                </div>
              {/each}
            </div>
          </div>
          <div class="stat-card p-5">
            <p class="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status Distribution</p>
            <canvas bind:this={donutCanvas}></canvas>
          </div>
        </div>
      {/if}

      <!-- Class-wise bar chart -->
      {#if classRows.length}
        <div class="stat-card p-5">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Class-wise Collection</p>
          <p class="text-xs text-muted-foreground mb-4">Billed vs Collected vs Pending — top 10 classes</p>
          <canvas bind:this={barCanvas} class="max-h-72"></canvas>
        </div>
      {/if}

      <!-- Top defaulters -->
      {#if topDefaulters.length}
        <div class="stat-card p-5">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Top Defaulters</p>
          <p class="text-xs text-muted-foreground mb-4">Students with highest outstanding fee balances</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="border-b text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th class="py-2.5 text-left">#</th><th class="py-2.5 text-left">Student</th><th class="py-2.5 text-left">Class</th><th class="py-2.5 text-right">Fee</th><th class="py-2.5 text-right">Paid</th><th class="py-2.5 text-right">Due</th><th class="py-2.5 text-center">Status</th>
              </tr></thead>
              <tbody>
                {#each topDefaulters as item,i (item.studentId)}
                  {@const cfg=statusCfg(item.status)}
                  <tr class="border-b hover:bg-rose-50/20">
                    <td class="py-2.5 text-xs text-muted-foreground">{i+1}</td>
                    <td class="py-2.5 font-medium">{item.student.name}</td>
                    <td class="py-2.5 text-muted-foreground">{item.student.class}</td>
                    <td class="py-2.5 text-right text-muted-foreground">{fmtS(item.totalFee)}</td>
                    <td class="py-2.5 text-right text-emerald-600">{fmtS(item.paidAmount)}</td>
                    <td class="py-2.5 text-right font-semibold text-rose-600">{fmtS(item.remainingAmount)}</td>
                    <td class="py-2.5 text-center"><span class="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold uppercase {cfg.bg} {cfg.text}">{cfg.label}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- FEE STRUCTURE                                                          -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'fee-structure'}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <!-- Form panel -->
        <div class="lg:col-span-2">
          <div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div class="mb-5 flex items-start justify-between">
              <div>
                <h3 class="text-sm font-bold">{editingId?'Edit Fee Structure':'New Fee Structure'}</h3>
                <p class="mt-0.5 text-xs text-muted-foreground">{editingId?'Update fees — assignments sync automatically':'Define fees for a class then auto-assign to all active students'}</p>
              </div>
              {#if editingId}<button onclick={cancelEdit} class="ml-2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">✕</button>{/if}
            </div>
            <form onsubmit={saveStructure} class="space-y-4">
              <div>
                <label for="fee-class" class="mb-1 block text-xs font-semibold text-foreground">Class <span class="text-red-500">*</span></label>
                <select id="fee-class" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" bind:value={feeForm.classId} disabled={!!editingId} required>
                  <option value="">Select class…</option>
                  {#each uniqueClasses as c (c._id)}<option value={c._id}>{c.name}</option>{/each}
                </select>
              </div>
              <div>
                <label for="fee-year" class="mb-1 block text-xs font-semibold text-foreground">Academic Year <span class="text-red-500">*</span></label>
                <input id="fee-year" type="text" placeholder="e.g. 2025-26" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" bind:value={feeForm.academicYear} disabled={!!editingId} required />
              </div>
              <div class="grid grid-cols-3 gap-2">
                {#each [['fee-acad','Academic Fee *','academicFee'],['fee-trans','Transport Fee','transportFee'],['fee-other','Other Fee','otherFee']] as [id,lbl,field] (id)}
                  <div>
                    <label for={id} class="mb-1 block text-xs font-semibold text-foreground">{lbl}</label>
                    <input {id} type="number" min="0" step="1" placeholder="0" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={feeForm[field as keyof FeeForm]} />
                  </div>
                {/each}
              </div>
              <div>
                <label for="fee-due" class="mb-1 block text-xs font-semibold text-foreground">Due Date <span class="text-red-500">*</span></label>
                <input id="fee-due" type="date" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={feeForm.dueDate} required />
              </div>
              <!-- Late fee -->
              <div class="overflow-hidden rounded-xl border border-border bg-muted/40">
                <button type="button" onclick={()=>(showLateFee=!showLateFee)} class="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-foreground hover:bg-muted">
                  <span>Late Fee Config (optional)</span><span>{showLateFee?'▲':'▼'}</span>
                </button>
                {#if showLateFee}
                  <div class="space-y-3 border-t border-border px-4 pb-4 pt-3">
                    <div>
                      <label for="fee-late-type" class="mb-1 block text-xs font-semibold text-foreground">Type</label>
                      <select id="fee-late-type" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={feeForm.lateFeeType}>
                        <option value="none">None</option><option value="fixed">Fixed (one-time)</option><option value="daily">Daily (per day overdue)</option><option value="percentage">Percentage of due amount</option>
                      </select>
                    </div>
                    {#if feeForm.lateFeeType!=='none'}
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label for="fee-late-amt" class="mb-1 block text-xs font-semibold text-foreground">{feeForm.lateFeeType==='percentage'?'Rate (%)':'Amount (₹)'}</label>
                          <input id="fee-late-amt" type="number" min="0" step="0.01" placeholder="0" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={feeForm.lateFeeAmount} />
                        </div>
                        <div>
                          <label for="fee-late-grace" class="mb-1 block text-xs font-semibold text-foreground">Grace Days</label>
                          <input id="fee-late-grace" type="number" min="0" step="1" placeholder="0" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={feeForm.lateFeeGraceDays} />
                        </div>
                      </div>
                    {/if}
                    <div>
                      <label for="fee-late-desc" class="mb-1 block text-xs font-semibold text-foreground">Description</label>
                      <input id="fee-late-desc" type="text" placeholder="e.g. ₹50/day after 7-day grace" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={feeForm.lateFeeDescription} />
                    </div>
                  </div>
                {/if}
              </div>
              {#if structureSaveError}<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{structureSaveError}</div>{/if}
              {#if structureSaveSuccess}<div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ {structureSaveSuccess}</div>{/if}
              <div class="flex gap-2">
                <button type="submit" disabled={savingStructure} class="flex-1 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60">
                  {savingStructure?'Saving…':editingId?'Update & Sync':'Create & Auto-Assign'}
                </button>
                {#if editingId}<button type="button" onclick={cancelEdit} class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>{/if}
              </div>
            </form>
          </div>
        </div>

        <!-- Table panel -->
        <div class="lg:col-span-3">
          <div class="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div class="mb-4">
              <h3 class="text-sm font-bold">Existing Fee Structures</h3>
              <p class="mt-0.5 text-xs text-muted-foreground">{structures.length} structure{structures.length!==1?'s':''} configured</p>
            </div>
            {#if structuresLoading}
              <div class="space-y-2">{#each Array(5) as _,i (i)}<div class="h-12 animate-pulse rounded-lg bg-slate-100"></div>{/each}</div>
            {:else if structuresError}
              <p class="py-8 text-center text-sm text-red-600">{structuresError}</p>
            {:else if structures.length===0}
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="mb-3 rounded-full bg-slate-100 p-4 text-2xl text-muted-foreground">+</div>
                <p class="text-sm font-semibold">No fee structures yet</p>
                <p class="mt-1 text-xs text-muted-foreground">Use the form to create one</p>
              </div>
            {:else}
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th class="py-2 text-left">Class / Year</th><th class="py-2 text-right">Acad.</th><th class="py-2 text-right">Trans.</th><th class="py-2 text-right">Other</th><th class="py-2 text-right">Due</th><th class="py-2 text-center">Paid/Total</th><th class="py-2 text-right">%</th><th class="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each structures as s (s._id)}
                      {@const cp=pct(s.paidCount,s.assignedCount)}
                      {@const cname=schoolClasses.find(c=>c._id===s.class_id)?.name||s.class_id}
                      <tr class="border-b transition-colors {editingId===s._id?'bg-indigo-50':'hover:bg-slate-50'}">
                        <td class="py-2.5"><p class="font-medium">{cname}</p><p class="text-xs text-muted-foreground">{s.academic_year}</p></td>
                        <td class="py-2.5 text-right">₹{s.academic_fee}</td>
                        <td class="py-2.5 text-right text-muted-foreground">₹{s.default_transport_fee}</td>
                        <td class="py-2.5 text-right text-muted-foreground">₹{s.other_fee}</td>
                        <td class="py-2.5 text-right text-xs text-muted-foreground">{s.due_date}</td>
                        <td class="py-2.5 text-center text-xs"><span class="font-semibold text-emerald-600">{s.paidCount}</span><span class="mx-1 text-muted-foreground">/</span><span class="text-muted-foreground">{s.assignedCount}</span></td>
                        <td class="py-2.5 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <div class="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-emerald-400" style="width:{cp}%"></div></div>
                            <span class="text-xs font-bold {cp>=75?'text-emerald-600':cp>=40?'text-amber-600':'text-rose-600'}">{cp}%</span>
                          </div>
                        </td>
                        <td class="py-2.5 pl-2">
                          <button onclick={()=>startEdit(s)} class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors {editingId===s._id?'border-indigo-300 bg-indigo-100 text-indigo-700':'border-border text-muted-foreground hover:bg-muted'}">
                            ✏ {editingId===s._id?'Editing':'Edit'}
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- RECORD PAYMENT                                                         -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'record-payment'}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div><h2 class="text-xl font-semibold">Student Fees</h2><p class="text-sm text-muted-foreground">View fee status and record payments for individual students</p></div>
          <button onclick={()=>loadStudentFees()} disabled={sfLoading} class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"><span class={sfLoading?'animate-spin':''}>↻</span> Refresh</button>
        </div>
        <!-- Filters -->
        <div class="flex flex-wrap gap-2">
          <select class="rounded-lg border border-border bg-card px-3 py-1.5 text-sm" bind:value={sfYear} onchange={()=>sfPage=1}>
            {#each years as y (y)}<option value={y}>{y}</option>{/each}
            {#if !years.length}<option value="">All Years</option>{/if}
          </select>
          <select class="rounded-lg border border-border bg-card px-3 py-1.5 text-sm" bind:value={sfClass} onchange={()=>sfPage=1}>
            <option value="">All Classes</option>
            {#each uniqueClasses as c (c._id)}<option value={c.name}>{c.name}</option>{/each}
          </select>
          <select class="rounded-lg border border-border bg-card px-3 py-1.5 text-sm" bind:value={sfStatus}>
            <option value="all">All Status</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="pending">Pending</option><option value="overdue">Overdue</option>
          </select>
          <div class="relative min-w-[200px] flex-1">
            <input type="text" placeholder="Search name, roll no…" class="w-full rounded-lg border border-border bg-card py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={sfSearch} oninput={()=>sfPage=1} />
            {#if sfSearch}<button onclick={()=>{sfSearch='';sfPage=1;}} class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">✕</button>{/if}
          </div>
        </div>
        <!-- Metrics -->
        {#if sfMetrics}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {#each [
              {l:'Total Students',v:String(sfMetrics.totalStudents),c:''},
              {l:'Total Fee',v:fmt(sfMetrics.currentTotalFee),c:''},
              {l:'Collected',v:fmt(sfMetrics.currentPaidAmount),c:'text-green-700'},
              {l:'Pending',v:fmt(sfMetrics.currentPendingAmount),c:'text-amber-600'},
              {l:'Overdue',v:String(sfMetrics.overdueCount),c:'text-red-600'},
              {l:'Outstanding',v:fmt(sfMetrics.outstandingBalance),c:''},
            ] as m (m.l)}
              <div class="rounded-xl border border-border bg-card px-4 py-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.l}</p>
                <p class="mt-1.5 text-lg font-bold {m.c}">{m.v}</p>
              </div>
            {/each}
          </div>
        {/if}
        <!-- Table -->
        <div class="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th class="px-4 py-3">Student</th><th class="px-4 py-3 text-right">Total Fee</th><th class="px-4 py-3 text-right">Paid</th><th class="px-4 py-3 text-right">Remaining</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Due Date</th><th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#if sfLoading}
                {#each Array(8) as _,i (i)}<tr>{#each Array(7) as __,j (j)}<td class="px-4 py-3"><div class="h-3 animate-pulse rounded bg-slate-100"></div></td>{/each}</tr>{/each}
              {:else if sfError}
                <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-red-600">{sfError}</td></tr>
              {:else if filteredSfItems.length===0}
                <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-muted-foreground">No students found</td></tr>
              {:else}
                {#each filteredSfItems as item (item.studentId)}
                  {@const cfg=statusCfg(item.status)}
                  <tr class="transition-colors hover:bg-muted/30">
                    <td class="px-4 py-3"><div class="font-medium">{item.student.name}</div><div class="mt-0.5 text-xs text-muted-foreground">{item.student.class}{item.student.rollNumber?` · Roll ${item.student.rollNumber}`:''}</div></td>
                    <td class="px-4 py-3 text-right font-medium">{fmt(item.totalFee)}</td>
                    <td class="px-4 py-3 text-right font-medium text-green-700">{fmt(item.paidAmount)}</td>
                    <td class="px-4 py-3 text-right font-medium text-amber-700">{fmt(item.remainingAmount)}</td>
                    <td class="px-4 py-3"><span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {cfg.bg} {cfg.text}">{cfg.label}</span></td>
                    <td class="px-4 py-3 text-xs text-muted-foreground">{item.dueDate?new Date(item.dueDate).toLocaleDateString('en-IN'):'—'}</td>
                    <td class="px-4 py-3">
                      <button disabled={!item.financeId||(item.status||'').toUpperCase()==='PAID'} onclick={()=>openPayModal(item)} class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">
                        {(item.status||'').toUpperCase()==='PAID'?'Paid':'Record Payment'}
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        {#if sfPagination&&sfPagination.totalPages>1}
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>{(sfPage-1)*20+1}–{Math.min(sfPage*20,sfPagination.totalItems)} of {sfPagination.totalItems} students</span>
            <div class="flex gap-1">
              <button onclick={()=>sfPage--} disabled={sfPage<=1} class="px-3 py-1 border border-border rounded-lg disabled:opacity-40">‹</button>
              {#each Array.from({length:Math.min(5,sfPagination.totalPages)},(_,i)=>i+Math.max(1,sfPage-2)) as p (p)}
                {#if p<=sfPagination.totalPages}
                  <button onclick={()=>(sfPage=p)} class="px-3 py-1 border rounded-lg {p===sfPage?'bg-primary text-primary-foreground border-primary':'border-border'}">{p}</button>
                {/if}
              {/each}
              <button onclick={()=>sfPage++} disabled={sfPage>=sfPagination.totalPages} class="px-3 py-1 border border-border rounded-lg disabled:opacity-40">›</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- SALARY                                                                 -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'salary'}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div><h2 class="text-xl font-semibold">Staff Salary</h2><p class="text-sm text-muted-foreground">Set and record salary payments for all staff members</p></div>
          <button onclick={()=>loadStaff()} disabled={staffLoading} class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"><span class={staffLoading?'animate-spin':''}>↻</span> Refresh</button>
        </div>
        {#if staffError}<div class="stat-card p-4 text-red-600 text-sm">{staffError}</div>{/if}
        <div class="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th class="px-4 py-3">Staff</th><th class="px-4 py-3 text-right">Salary</th><th class="px-4 py-3 text-right">Paid</th><th class="px-4 py-3 text-right">Due</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Year</th><th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#if staffLoading}
                {#each Array(6) as _,i (i)}<tr>{#each Array(7) as __,j (j)}<td class="px-4 py-3"><div class="h-3 animate-pulse rounded bg-slate-100"></div></td>{/each}</tr>{/each}
              {:else if staffSummary.length===0}
                <tr><td colspan="7" class="px-4 py-10 text-center text-sm text-muted-foreground">No staff found</td></tr>
              {:else}
                {#each staffSummary as item (item.staffId._id)}
                  {@const cfg=statusCfg(item.status)}
                  {@const due=item.salary-item.paidAmount}
                  <tr class="transition-colors hover:bg-muted/30">
                    <td class="px-4 py-3"><div class="font-medium">{item.staffId.name}</div><div class="text-xs text-muted-foreground">{item.staffId.position||''}{item.staffId.department?` · ${item.staffId.department}`:''}</div></td>
                    <td class="px-4 py-3 text-right font-medium">{item.salary>0?fmt(item.salary):'—'}</td>
                    <td class="px-4 py-3 text-right font-medium text-green-700">{item.paidAmount>0?fmt(item.paidAmount):'—'}</td>
                    <td class="px-4 py-3 text-right font-medium text-amber-700">{due>0?fmt(due):'—'}</td>
                    <td class="px-4 py-3"><span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {cfg.bg} {cfg.text}">{cfg.label}</span></td>
                    <td class="px-4 py-3 text-xs text-muted-foreground">{item.academicYear}</td>
                    <td class="px-4 py-3">
                      <button onclick={()=>{salaryModal=item;salaryForm={financeId:item.financeId||null,staffId:item.staffId._id,staffName:item.staffId.name,amount:String(item.salary||''),paidAmount:'',paymentDate:new Date().toISOString().slice(0,10),academicYear:item.academicYear,description:'',recordPaymentEntry:!!item.financeId};salaryError='';}}
                        class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        {item.financeId?'Pay':'Set Salary'}
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- INVESTOR LEDGER                                                        -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'investor-ledger'}
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <div><h2 class="text-xl font-semibold">Investor Ledger</h2><p class="text-sm text-muted-foreground">Track investor and trustee funding, repayments, and balances</p></div>
          <button onclick={()=>{showInvestorForm=!showInvestorForm;investorError='';}} class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">+ Add Investor</button>
        </div>
        {#if investorsError}<div class="stat-card p-4 text-red-600 text-sm">{investorsError}</div>{/if}
        {#if showInvestorForm}
          <div class="stat-card p-5">
            <h3 class="text-sm font-bold mb-4">New Investor Account</h3>
            <form onsubmit={createInvestor} class="space-y-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label class="mb-1 block text-xs font-semibold text-foreground">Investor Name *</label><input type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={investorForm.investorName} required /></div>
                <div><label class="mb-1 block text-xs font-semibold text-foreground">Type</label><select class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={investorForm.investorType}><option value="investor">Investor</option><option value="trustee">Trustee</option><option value="other">Other</option></select></div>
                <div><label class="mb-1 block text-xs font-semibold text-foreground">Contact</label><input type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={investorForm.contact} placeholder="Phone or email" /></div>
                <div><label class="mb-1 block text-xs font-semibold text-foreground">Initial Investment (₹)</label><input type="number" min="0" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={investorForm.initialInvestment} placeholder="0" /></div>
                {#if Number(investorForm.initialInvestment)>0}
                  <div><label class="mb-1 block text-xs font-semibold text-foreground">Date</label><input type="date" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={investorForm.date} /></div>
                {/if}
                <div><label class="mb-1 block text-xs font-semibold text-foreground">Description</label><input type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={investorForm.description} placeholder="Optional notes" /></div>
              </div>
              {#if investorError}<div class="text-xs text-red-600">{investorError}</div>{/if}
              <div class="flex gap-2">
                <button type="submit" disabled={investorSaving} class="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60">{investorSaving?'Creating…':'Create Account'}</button>
                <button type="button" onclick={()=>(showInvestorForm=false)} class="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              </div>
            </form>
          </div>
        {/if}
        {#if investorsLoading}
          <div class="h-48 animate-pulse rounded-2xl bg-slate-100"></div>
        {:else if investors.length===0}
          <div class="stat-card p-12 text-center"><p class="text-sm font-semibold text-muted-foreground">No investor accounts yet</p><p class="text-xs text-muted-foreground mt-1">Click "Add Investor" to create the first account</p></div>
        {:else}
          <div class="space-y-4">
            {#each investors as inv (inv._id)}
              <div class="stat-card p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold">{inv.investorName}</h3>
                      <span class="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 capitalize">{inv.investorType}</span>
                      <span class="rounded-full px-2 py-0.5 text-xs font-medium {inv.status==='Active'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}">{inv.status}</span>
                    </div>
                    {#if inv.contact}<p class="text-xs text-muted-foreground mt-0.5">{inv.contact}</p>{/if}
                  </div>
                  <div class="flex gap-2">
                    <button onclick={()=>{txModal={id:inv._id,name:inv.investorName};txForm={type:'investment',amount:'',date:new Date().toISOString().slice(0,10),note:''};txError='';}} class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">+ Transaction</button>
                    <button onclick={()=>deleteInvestor(inv._id)} class="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Delete</button>
                  </div>
                </div>
                <div class="mt-4 grid grid-cols-3 gap-3">
                  <div class="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center"><p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Total Invested</p><p class="mt-1 text-lg font-bold text-emerald-700">{fmt(inv.totalInvested)}</p></div>
                  <div class="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-center"><p class="text-xs font-semibold uppercase tracking-wide text-amber-600">Total Repaid</p><p class="mt-1 text-lg font-bold text-amber-700">{fmt(inv.totalRepaid)}</p></div>
                  <div class="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center"><p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Balance Due</p><p class="mt-1 text-lg font-bold text-indigo-700">{fmt(inv.balanceToRepay)}</p></div>
                </div>
                {#if inv.transactions.length}
                  <div class="mt-4 overflow-x-auto">
                    <table class="w-full text-xs">
                      <thead><tr class="border-b text-muted-foreground"><th class="py-1.5 text-left font-semibold uppercase tracking-wide">Type</th><th class="py-1.5 text-right font-semibold uppercase tracking-wide">Amount</th><th class="py-1.5 text-left font-semibold uppercase tracking-wide px-3">Date</th><th class="py-1.5 text-left font-semibold uppercase tracking-wide">Note</th></tr></thead>
                      <tbody>
                        {#each [...inv.transactions].reverse() as tx (tx._id||tx.date+tx.amount)}
                          <tr class="border-b hover:bg-muted/20">
                            <td class="py-1.5"><span class="rounded-full px-2 py-0.5 text-xs font-medium {tx.type==='investment'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'} capitalize">{tx.type}</span></td>
                            <td class="py-1.5 text-right font-medium {tx.type==='investment'?'text-emerald-700':'text-amber-700'}">{fmt(tx.amount)}</td>
                            <td class="py-1.5 px-3 text-muted-foreground">{tx.date}</td>
                            <td class="py-1.5 text-muted-foreground">{tx.note||'—'}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- EXPENSE — Phase 2                                                      -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'expense'}
      <div class="rounded-[28px] border border-rose-200 bg-[linear-gradient(145deg,#fff1f2_0%,#ffffff_40%,#f8fafc_100%)] p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold text-slate-900">Expense Management</h3>
            <p class="mt-1 text-sm text-slate-600">Track and manage all operational expenses, purchases, and outgoing cash.</p>
          </div>
          <span class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-rose-600">Phase 2 — Coming Soon</span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each ['Add Expense','Expense List','Categories','Reports'] as item (item)}
            <div class="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm text-center opacity-50">
              <div class="mx-auto mb-3 h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 text-lg">📝</div>
              <p class="text-sm font-semibold text-slate-700">{item}</p>
              <p class="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- BANKING — Phase 2                                                      -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'banking'}
      <div class="rounded-[28px] border border-violet-200 bg-[linear-gradient(145deg,#f5f3ff_0%,#ffffff_40%,#f8fafc_100%)] p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold text-slate-900">Banking Details</h3>
            <p class="mt-1 text-sm text-slate-600">Manage bank accounts, transactions, loans, and settlement references.</p>
          </div>
          <span class="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-violet-600">Phase 2 — Coming Soon</span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each ['Accounts','Transactions','Loans','Summary'] as item (item)}
            <div class="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm text-center opacity-50">
              <div class="mx-auto mb-3 h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-400 text-lg">🏦</div>
              <p class="text-sm font-semibold text-slate-700">{item}</p>
              <p class="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- SCHOOL INVESTMENT — Phase 2                                            -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'school-investment'}
      <div class="rounded-[28px] border border-emerald-200 bg-[linear-gradient(145deg,#f7fee7_0%,#ffffff_40%,#f8fafc_100%)] p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold text-slate-900">School Investment</h3>
            <p class="mt-1 text-sm text-slate-600">Record and track school investments, capital assets, depreciation, approvals and documentation.</p>
          </div>
          <span class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-600">Phase 2 — Coming Soon</span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each ['Dashboard Overview','Add Investment','Asset Register','Reports'] as item (item)}
            <div class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm text-center opacity-50">
              <div class="mx-auto mb-3 h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400 text-lg">🏗️</div>
              <p class="text-sm font-semibold text-slate-700">{item}</p>
              <p class="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- ASSET MODULE — Phase 2                                                 -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    {#if activeAction === 'asset'}
      <div class="rounded-[28px] border border-indigo-200 bg-[linear-gradient(145deg,#eef2ff_0%,#ffffff_40%,#f8fafc_100%)] p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h3 class="text-2xl font-semibold text-slate-900">Asset Module</h3>
            <p class="mt-1 text-sm text-slate-600">Manage asset register, depreciation tracking, and lifecycle status from one workspace.</p>
          </div>
          <span class="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-600">Phase 2 — Coming Soon</span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each ['Asset Register','Depreciation','Maintenance','Disposal'] as item (item)}
            <div class="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm text-center opacity-50">
              <div class="mx-auto mb-3 h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 text-lg">📦</div>
              <p class="text-sm font-semibold text-slate-700">{item}</p>
              <p class="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

  </div>
</div>

<!-- ── Payment Modal ──────────────────────────────────────────────────────── -->
{#if modalItem}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-md rounded-2xl bg-card shadow-2xl">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <div><h3 class="font-semibold">Record Payment</h3><p class="text-xs text-muted-foreground mt-0.5">{modalItem.student.name} · {modalItem.student.class}</p></div>
        <button onclick={()=>{modalItem=null;}} class="rounded-lg p-1 hover:bg-muted">✕</button>
      </div>
      <div class="border-b border-border bg-muted/30 px-5 py-3">
        <div class="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Fee Breakdown</span><span>Remaining: <span class="font-semibold text-red-600">{fmt(modalItem.remainingAmount)}</span></span>
        </div>
        <div class="space-y-1">
          {#each modalItem.feeComponents as fc (fc.label)}<div class="flex justify-between text-xs text-muted-foreground"><span>{fc.label}</span><span>{fmt(fc.amount)}</span></div>{/each}
          {#if (modalItem.olderPendingAmount??0)>0}<div class="flex justify-between text-xs font-medium text-amber-700"><span>Older year dues</span><span>{fmt(modalItem.olderPendingAmount??0)}</span></div>{/if}
        </div>
      </div>
      <form onsubmit={recordPayment} class="space-y-3 px-5 py-4">
        <div class="grid grid-cols-2 gap-3">
          <div><label for="pay-amount" class="block text-xs font-medium text-foreground mb-1">Amount (₹) *</label><input id="pay-amount" type="number" min="1" step="0.01" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={payForm.amount} /></div>
          <div><label for="pay-date" class="block text-xs font-medium text-foreground mb-1">Payment Date *</label><input id="pay-date" type="date" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={payForm.date} /></div>
        </div>
        <div><label for="pay-mode" class="block text-xs font-medium text-foreground mb-1">Payment Mode *</label><select id="pay-mode" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={payForm.mode}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank Transfer</option></select></div>
        <div><label for="pay-ref" class="block text-xs font-medium text-foreground mb-1">Reference No.</label><input id="pay-ref" type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Transaction ID / Cheque No." bind:value={payForm.refNo} /></div>
        <div><label for="pay-remarks" class="block text-xs font-medium text-foreground mb-1">Remarks</label><input id="pay-remarks" type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Optional notes" bind:value={payForm.remarks} /></div>
        {#if payError}<p class="text-xs text-red-600">{payError}</p>{/if}
        <div class="flex gap-2 pt-1">
          <button type="button" onclick={()=>{modalItem=null;}} class="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={payLoading} class="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{payLoading?'Saving…':'Record Payment'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Salary Modal ───────────────────────────────────────────────────────── -->
{#if salaryModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-md rounded-2xl bg-card shadow-2xl">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <div><h3 class="font-semibold">{salaryModal.financeId?'Record Salary Payment':'Set Salary'}</h3><p class="text-xs text-muted-foreground mt-0.5">{salaryModal.staffId.name}</p></div>
        <button onclick={()=>{salaryModal=null;}} class="rounded-lg p-1 hover:bg-muted">✕</button>
      </div>
      <form onsubmit={saveSalary} class="space-y-3 px-5 py-4">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs font-medium text-foreground mb-1">{salaryModal.financeId?'Salary Amount':'Monthly Salary (₹) *'}</label><input type="number" min="0" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={salaryForm.amount} required /></div>
          {#if salaryModal.financeId}
            <div><label class="block text-xs font-medium text-foreground mb-1">Amount Paying (₹) *</label><input type="number" min="0" step="0.01" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={salaryForm.paidAmount} /></div>
          {/if}
        </div>
        {#if salaryModal.financeId}
          <div><label class="block text-xs font-medium text-foreground mb-1">Payment Date</label><input type="date" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={salaryForm.paymentDate} /></div>
        {/if}
        <div><label class="block text-xs font-medium text-foreground mb-1">Academic Year</label><input type="text" placeholder="e.g. 2025-26" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={salaryForm.academicYear} /></div>
        <div><label class="block text-xs font-medium text-foreground mb-1">Description</label><input type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Optional notes" bind:value={salaryForm.description} /></div>
        {#if salaryError}<p class="text-xs text-red-600">{salaryError}</p>{/if}
        <div class="flex gap-2 pt-1">
          <button type="button" onclick={()=>{salaryModal=null;}} class="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={salarySaving} class="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{salarySaving?'Saving…':salaryModal.financeId?'Record Payment':'Set Salary'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Investor Transaction Modal ─────────────────────────────────────────── -->
{#if txModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-sm rounded-2xl bg-card shadow-2xl">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <div><h3 class="font-semibold">Add Transaction</h3><p class="text-xs text-muted-foreground mt-0.5">{txModal.name}</p></div>
        <button onclick={()=>{txModal=null;}} class="rounded-lg p-1 hover:bg-muted">✕</button>
      </div>
      <form onsubmit={addTx} class="space-y-3 px-5 py-4">
        <div><label class="block text-xs font-medium text-foreground mb-1">Transaction Type</label><select class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={txForm.type}><option value="investment">Investment (incoming)</option><option value="repayment">Repayment (outgoing)</option></select></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs font-medium text-foreground mb-1">Amount (₹) *</label><input type="number" min="0" step="0.01" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" bind:value={txForm.amount} required /></div>
          <div><label class="block text-xs font-medium text-foreground mb-1">Date *</label><input type="date" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" bind:value={txForm.date} /></div>
        </div>
        <div><label class="block text-xs font-medium text-foreground mb-1">Note</label><input type="text" class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Optional note" bind:value={txForm.note} /></div>
        {#if txError}<p class="text-xs text-red-600">{txError}</p>{/if}
        <div class="flex gap-2 pt-1">
          <button type="button" onclick={()=>{txModal=null;}} class="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={txSaving} class="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{txSaving?'Saving…':'Add Transaction'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
