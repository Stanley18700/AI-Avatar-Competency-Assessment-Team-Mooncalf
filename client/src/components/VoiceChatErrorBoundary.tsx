import React from 'react';

interface VoiceChatErrorBoundaryProps {
  children: React.ReactNode;
}

interface VoiceChatErrorBoundaryState {
  hasError: boolean;
}

export default class VoiceChatErrorBoundary extends React.Component<VoiceChatErrorBoundaryProps, VoiceChatErrorBoundaryState> {
  state: VoiceChatErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): VoiceChatErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[VoiceChat] Runtime error:', error);
  }

  handleReload = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-700">ระบบสนทนาด้วยเสียงขัดข้องชั่วคราว</p>
          <p className="text-sm text-red-600 mt-1">กรุณาเริ่มการสนทนาใหม่อีกครั้ง</p>
          <button onClick={this.handleReload} className="btn-primary mt-4">
            เริ่มใหม่
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
