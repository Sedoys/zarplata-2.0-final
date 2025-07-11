import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

function getCurrentWeekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString("ru-RU"),
    end: sunday.toLocaleDateString("ru-RU")
  };
}

export default function App() {
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem("employees_v2");
    return saved ? JSON.parse(saved) : [];
  });
  const [name, setName] = useState("");
  const [weeklySalary, setWeeklySalary] = useState("");
  const today = new Date().toLocaleDateString("ru-RU");

  useEffect(() => {
    localStorage.setItem("employees_v2", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    const weekStart = getCurrentWeekRange().start;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.lastWeek !== weekStart) {
          return { ...emp, paid: false, bonus: 0, deductions: 0, lastWeek: weekStart };
        }
        return emp;
      })
    );
  }, []);

  const addEmployee = () => {
    if (!name || !weeklySalary) return;
    setEmployees((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        weeklySalary: parseFloat(weeklySalary),
        paid: false,
        bonus: 0,
        deductions: 0,
        history: [],
        added: today,
        lastWeek: getCurrentWeekRange().start,
        showHistory: false
      }
    ]);
    setName("");
    setWeeklySalary("");
  };

  const togglePaid = (id) => {
    const week = getCurrentWeekRange();
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          if (emp.paid) return emp;
          const total = emp.weeklySalary + (emp.bonus || 0) - (emp.deductions || 0);
          return {
            ...emp,
            paid: true,
            lastPaidDate: today,
            history: [...emp.history, { week: `${week.start}–${week.end}`, amount: total }]
          };
        }
        return emp;
      })
    );
  };

  const removeEmployee = (id) => {
    if (confirm("Удалить сотрудника?")) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    }
  };

  const exportExcel = () => {
    const data = employees.flatMap((emp) =>
      emp.history.map((h) => ({
        Сотрудник: emp.name,
        Неделя: h.week,
        Сумма: h.amount
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Выплаты");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "zarplata.xlsx");
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">
        Зарплатная ведомость — {today}
      </h1>
      <div className="mb-4 flex gap-2">
        <input
          placeholder="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded w-1/3"
        />
        <input
          placeholder="Зарплата за неделю"
          type="number"
          value={weeklySalary}
          onChange={(e) => setWeeklySalary(e.target.value)}
          className="p-2 border rounded w-1/3"
        />
        <button
          onClick={addEmployee}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Сотрудник
        </button>
        <button
          onClick={exportExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          📁 Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className={`p-4 rounded-lg shadow-md border-l-4 ${
              emp.paid ? "border-green-500 bg-green-50" : "border-blue-500 bg-white"
            } transition`}
          >
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-xl font-semibold">{emp.name}</h2>
                <p className="text-sm text-gray-600">
                  Добавлен: {emp.added}
                  {emp.lastPaidDate && ` • Выплачено: ${emp.lastPaidDate}`}
                </p>
              </div>
              <button onClick={() => removeEmployee(emp.id)} className="text-red-500 text-xl">
                ✕
              </button>
            </div>

            <div className="mb-2">
              <label>Зарплата за неделю:</label>
              <input
                type="number"
                value={emp.weeklySalary}
                onChange={(e) =>
                  setEmployees((prev) =>
                    prev.map((el) =>
                      el.id === emp.id ? { ...el, weeklySalary: parseFloat(e.target.value) } : el
                    )
                  )
                }
                className="border p-1 rounded w-full"
              />
              <p className="text-xs text-gray-500">
                (в день: {(emp.weeklySalary / 5).toFixed(2)} ₽)
              </p>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  const b = prompt("Размер премии?", emp.bonus || 0);
                  if (b !== null)
                    setEmployees((prev) =>
                      prev.map((el) =>
                        el.id === emp.id ? { ...el, bonus: parseFloat(b) } : el
                      )
                    );
                }}
                className="bg-yellow-400 px-3 py-1 rounded"
              >
                + Премия
              </button>
              <button
                onClick={() => {
                  const d = prompt("Размер удержания?", emp.deductions || 0);
                  if (d !== null)
                    setEmployees((prev) =>
                      prev.map((el) =>
                        el.id === emp.id ? { ...el, deductions: parseFloat(d) } : el
                      )
                    );
                }}
                className="bg-red-300 px-3 py-1 rounded"
              >
                - Удержание
              </button>
              <button
                onClick={() => togglePaid(emp.id)}
                className={`px-3 py-1 rounded text-white ${
                  emp.paid ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {emp.paid ? "Уже выплачено" : "Выплачено"}
              </button>
              <button
                onClick={() =>
                  setEmployees((prev) =>
                    prev.map((el) =>
                      el.id === emp.id ? { ...el, showHistory: !el.showHistory } : el
                    )
                  )
                }
                className="px-3 py-1 rounded bg-indigo-500 text-white"
              >
                История
              </button>
            </div>

            {emp.showHistory && (
              <div className="text-sm text-gray-700 border-t pt-2">
                {emp.history.length === 0 ? (
                  <p>История пуста</p>
                ) : (
                  emp.history.map((h, i) => (
                    <div key={i}>📅 {h.week} — {h.amount} ₽</div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}