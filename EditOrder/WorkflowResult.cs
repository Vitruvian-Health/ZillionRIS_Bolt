namespace ZillionRis
{
    internal struct WorkflowResult
    {
        #region Fields

        public static readonly WorkflowResult Stop = new WorkflowResult(true, true);
        public static readonly WorkflowResult NoRedirect = new WorkflowResult(true, false);
        public static readonly WorkflowResult Continue = new WorkflowResult(false, false);

        #endregion

        #region Properties

        public bool DoNotContinue { get; set; }
        public bool DoNotRedirect { get; set; }

        #endregion

        #region Constructors

        private WorkflowResult(bool doNotRedirect, bool doNotContinue)
            : this()
        {
            this.DoNotRedirect = doNotRedirect;
            this.DoNotContinue = doNotContinue;
        }

        #endregion
    }
}