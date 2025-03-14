using System;
using System.Collections.Generic;
using DelftDI.ZillionRis.Logging;


namespace ZillionRis.Common
{
    public sealed class DisposableContainer : IDisposable
    {
        private readonly List<IDisposable> _list = new List<IDisposable>();

        public void Dispose()
        {
            List<IDisposable> disposables;
            lock (_list)
            {
                disposables = new List<IDisposable>(_list);
                _list.Clear();
            }

            foreach (IDisposable disposable in disposables)
            {
                if (disposable != null)
                {
                    try
                    {
                        disposable.Dispose();
                    }
                    catch (Exception ex)
                    {
                        ZillionRisLog.Default.Write(ZillionRisLogLevel.Warning, "DisposableContainer: Could not dispose of " + disposable.GetType().FullName + ": " + ex);
                    }
                }
            }
        }

        public void Register(params IDisposable[] instances)
        {
            lock (_list)
                _list.AddRange(instances);
        }

        public void Register(IEnumerable<IDisposable> instances)
        {
            lock (_list)
                _list.AddRange(instances);
        }

        public void Register(IDisposable instance)
        {
            lock (_list)
            {
                _list.Add(instance);
            }
        }
    }
}